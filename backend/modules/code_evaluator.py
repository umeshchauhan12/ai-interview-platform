"""
Code Evaluator Module (Multi-Language)
-----------------------------------------
Safely executes candidate-submitted code in Python, C, C++, Java, or
JavaScript and checks it against predefined test cases - similar to a
LeetCode/HackerRank style coding round.

Judging approach: stdin/stdout based (like competitive programming
judges). The candidate's code reads input from standard input and prints
the answer to standard output, in whichever language they choose. This
makes the same problem set work identically across all supported
languages.

Safety approach: code runs in a separate subprocess with a timeout, so an
infinite loop or heavy computation cannot hang or crash the server.
Compiled languages (C/C++/Java) build in a temporary directory that is
deleted afterward.

Requirements on the system for each language to work:
  - python      -> Python itself (already required for this backend)
  - c           -> gcc
  - cpp         -> g++
  - java        -> JDK (javac + java)
  - javascript  -> Node.js
If a required compiler/runtime isn't installed, that language's
submissions will return a clear "not found" error rather than crashing.
"""

import subprocess
import sys
import tempfile
import os
import random

# ------------------------------------------------------------------
# Every question is classified by its input "pattern" and how its
# result should be printed. This lets us auto-generate a starter
# template (in any supported language) that already handles reading
# input and printing output - the candidate only needs to fill in the
# actual logic inside solve(...), like a LeetCode-style experience,
# while what actually runs behind the scenes is still a full program.
#
# Patterns:
#   line_text  -> one line of text            -> solve(s)
#   int_list   -> one line of space-ints       -> solve(arr)
#   two_ints   -> one line, two space-ints     -> solve(a, b)
#   single_int -> one line, one int            -> solve(n)
#   two_lines  -> two lines of text            -> solve(s1, s2)
#
# Output types:
#   raw    -> print the returned value as-is
#   yesno  -> print "yes" if the returned value is truthy, else "no"
# ------------------------------------------------------------------
QUESTION_IO_META = {
    "reverse_string": {"pattern": "line_text", "output": "raw"},
    "is_palindrome": {"pattern": "line_text", "output": "yesno"},
    "reverse_words": {"pattern": "line_text", "output": "raw"},
    "count_vowels": {"pattern": "line_text", "output": "raw"},
    "valid_parentheses": {"pattern": "line_text", "output": "yesno"},
    "longest_subarray_ones_after_deleting": {"pattern": "int_list", "output": "raw"},
    "max_of_array": {"pattern": "int_list", "output": "raw"},
    "unique_elements": {"pattern": "int_list", "output": "raw"},
    "second_largest": {"pattern": "int_list", "output": "raw"},
    "max_subarray_sum": {"pattern": "int_list", "output": "raw"},
    "sum_two_numbers": {"pattern": "two_ints", "output": "raw"},
    "gcd_two_numbers": {"pattern": "two_ints", "output": "raw"},
    "factorial": {"pattern": "single_int", "output": "raw"},
    "fibonacci_nth": {"pattern": "single_int", "output": "raw"},
    "is_prime": {"pattern": "single_int", "output": "yesno"},
    "longest_common_subsequence": {"pattern": "two_lines", "output": "raw"},
    "url_slug_validator": {"pattern": "line_text", "output": "yesno"},
    "query_param_parser": {"pattern": "line_text", "output": "raw"},
    "http_status_category": {"pattern": "single_int", "output": "raw"},
    "sql_where_counter": {"pattern": "line_text", "output": "raw"},
    "docker_image_tag_validator": {"pattern": "line_text", "output": "yesno"},
}

# Coding question bank - each test case is defined as raw stdin text and
# the exact expected stdout text (surrounding whitespace is ignored).
CODING_QUESTIONS = {
    "python developer": [
        {
            "id": "reverse_string",
            "title": "Reverse a String",
            "description": (
                "Read a single line of text from standard input and print "
                "its reverse to standard output."
            ),
            "difficulty": "easy",
            "tags": ["strings", "python"],
            "test_cases": [
                {"stdin": "hello\n", "expected": "olleh"},
                {"stdin": "Python\n", "expected": "nohtyP"},
                {"stdin": "abc\n", "expected": "cba"},
            ]
        },
        {
            "id": "longest_subarray_ones_after_deleting",
            "title": "Longest Subarray of 1's After Deleting One Element",
            "description": (
                "Read a line of space-separated 0s and 1s (a binary array). "
                "You must delete exactly one element from it. Print the size "
                "of the longest subarray containing only 1's in the "
                "resulting array. Print 0 if no such subarray exists."
            ),
            "difficulty": "medium",
            "tags": ["arrays", "data structures", "algorithms"],
            "test_cases": [
                {"stdin": "1 1 0 1\n", "expected": "3"},
                {"stdin": "0 1 1 1 0 1 1 0 1\n", "expected": "5"},
            ]
        },
        {
            "id": "sum_two_numbers",
            "title": "Sum of Two Numbers",
            "description": (
                "Read two space-separated integers from standard input and "
                "print their sum."
            ),
            "difficulty": "easy",
            "tags": ["math"],
            "test_cases": [
                {"stdin": "3 5\n", "expected": "8"},
                {"stdin": "10 -2\n", "expected": "8"},
                {"stdin": "0 0\n", "expected": "0"},
            ]
        },
        {
            "id": "count_vowels",
            "title": "Count Vowels",
            "description": (
                "Read a line of lowercase text from standard input and print "
                "the number of vowels (a, e, i, o, u) it contains."
            ),
            "difficulty": "medium",
            "tags": ["strings", "python"],
            "test_cases": [
                {"stdin": "hello world\n", "expected": "3"},
                {"stdin": "python\n", "expected": "1"},
                {"stdin": "aeiou\n", "expected": "5"},
            ]
        },
        {
            "id": "is_palindrome",
            "title": "Check Palindrome",
            "description": (
                "Read a line of text and print 'yes' if it reads the same "
                "forwards and backwards, otherwise print 'no'."
            ),
            "difficulty": "easy",
            "tags": ["strings"],
            "test_cases": [
                {"stdin": "madam\n", "expected": "yes"},
                {"stdin": "hello\n", "expected": "no"},
                {"stdin": "level\n", "expected": "yes"},
            ]
        },
        {
            "id": "max_of_array",
            "title": "Find Maximum",
            "description": (
                "Read a line of space-separated integers and print the "
                "largest one."
            ),
            "difficulty": "easy",
            "tags": ["arrays", "data structures"],
            "test_cases": [
                {"stdin": "3 7 2 9 4\n", "expected": "9"},
                {"stdin": "-5 -1 -8\n", "expected": "-1"},
                {"stdin": "1\n", "expected": "1"},
            ]
        },
        {
            "id": "factorial",
            "title": "Factorial",
            "description": (
                "Read an integer n and print n! (n factorial)."
            ),
            "difficulty": "easy",
            "tags": ["math", "recursion"],
            "test_cases": [
                {"stdin": "5\n", "expected": "120"},
                {"stdin": "0\n", "expected": "1"},
                {"stdin": "7\n", "expected": "5040"},
            ]
        },
        {
            "id": "fibonacci_nth",
            "title": "Nth Fibonacci Number",
            "description": (
                "Read an integer n and print the nth Fibonacci number "
                "(0-indexed: fib(0)=0, fib(1)=1)."
            ),
            "difficulty": "medium",
            "tags": ["math", "recursion", "dynamic programming"],
            "test_cases": [
                {"stdin": "6\n", "expected": "8"},
                {"stdin": "0\n", "expected": "0"},
                {"stdin": "10\n", "expected": "55"},
            ]
        },
        {
            "id": "is_prime",
            "title": "Check Prime Number",
            "description": (
                "Read an integer and print 'yes' if it is a prime number, "
                "otherwise print 'no'."
            ),
            "difficulty": "easy",
            "tags": ["math"],
            "test_cases": [
                {"stdin": "7\n", "expected": "yes"},
                {"stdin": "10\n", "expected": "no"},
                {"stdin": "2\n", "expected": "yes"},
            ]
        },
        {
            "id": "unique_elements",
            "title": "Count Unique Elements",
            "description": (
                "Read a line of space-separated integers and print how "
                "many distinct values it contains."
            ),
            "difficulty": "easy",
            "tags": ["arrays", "data structures", "sql"],
            "test_cases": [
                {"stdin": "1 2 2 3 3 3\n", "expected": "3"},
                {"stdin": "5 5 5\n", "expected": "1"},
                {"stdin": "1 2 3 4\n", "expected": "4"},
            ]
        },
        {
            "id": "reverse_words",
            "title": "Reverse Word Order",
            "description": (
                "Read a line of space-separated words and print them in "
                "reverse order, space-separated."
            ),
            "difficulty": "medium",
            "tags": ["strings"],
            "test_cases": [
                {"stdin": "the sky is blue\n", "expected": "blue is sky the"},
                {"stdin": "hello world\n", "expected": "world hello"},
            ]
        },
        {
            "id": "gcd_two_numbers",
            "title": "GCD of Two Numbers",
            "description": (
                "Read two space-separated integers and print their "
                "greatest common divisor."
            ),
            "difficulty": "medium",
            "tags": ["math", "recursion"],
            "test_cases": [
                {"stdin": "12 18\n", "expected": "6"},
                {"stdin": "7 13\n", "expected": "1"},
                {"stdin": "100 75\n", "expected": "25"},
            ]
        },
        {
            "id": "second_largest",
            "title": "Second Largest Number",
            "description": (
                "Read a line of space-separated integers and print the "
                "second largest distinct value."
            ),
            "difficulty": "medium",
            "tags": ["arrays", "data structures"],
            "test_cases": [
                {"stdin": "3 7 2 9 4\n", "expected": "7"},
                {"stdin": "1 1 2\n", "expected": "1"},
            ]
        },
        {
            "id": "longest_common_subsequence",
            "title": "Longest Common Subsequence",
            "description": (
                "Read two lines, each containing a string. Print the length "
                "of the longest common subsequence between them."
            ),
            "difficulty": "hard",
            "tags": ["strings", "dynamic programming", "algorithms"],
            "test_cases": [
                {"stdin": "abcde\nace\n", "expected": "3"},
                {"stdin": "abc\nabc\n", "expected": "3"},
                {"stdin": "abc\ndef\n", "expected": "0"},
            ]
        },
        {
            "id": "max_subarray_sum",
            "title": "Maximum Subarray Sum (Kadane's Algorithm)",
            "description": (
                "Read a line of space-separated integers (may include "
                "negatives) and print the largest possible sum of a "
                "contiguous subarray."
            ),
            "difficulty": "hard",
            "tags": ["arrays", "dynamic programming", "algorithms"],
            "test_cases": [
                {"stdin": "-2 1 -3 4 -1 2 1 -5 4\n", "expected": "6"},
                {"stdin": "1 2 3 4\n", "expected": "10"},
                {"stdin": "-1 -2 -3\n", "expected": "-1"},
            ]
        },
        {
            "id": "valid_parentheses",
            "title": "Valid Parentheses",
            "description": (
                "Read a line containing only the characters ( ) { } [ ]. "
                "Print 'yes' if the brackets are validly matched and "
                "nested, otherwise print 'no'."
            ),
            "difficulty": "hard",
            "tags": ["strings", "data structures", "algorithms"],
            "test_cases": [
                {"stdin": "()[]{}\n", "expected": "yes"},
                {"stdin": "(]\n", "expected": "no"},
                {"stdin": "([{}])\n", "expected": "yes"},
                {"stdin": "(]\n", "expected": "no"},
            ]
        },
        {
            "id": "url_slug_validator",
            "title": "Valid URL Slug",
            "description": (
                "Read a line of text. Print 'yes' if it is a valid URL "
                "slug (only lowercase letters, digits, and hyphens, and it "
                "does not start or end with a hyphen), otherwise print 'no'. "
                "This mirrors slug validation commonly used in web "
                "frameworks like Django when generating clean URLs."
            ),
            "difficulty": "easy",
            "tags": ["strings", "web", "django"],
            "test_cases": [
                {"stdin": "my-blog-post\n", "expected": "yes"},
                {"stdin": "-bad-slug\n", "expected": "no"},
                {"stdin": "Not_Valid!\n", "expected": "no"},
            ]
        },
        {
            "id": "query_param_parser",
            "title": "Parse Query String Parameters",
            "description": (
                "Read a line representing a URL query string (e.g. "
                "'name=John&age=25'). Print the number of key-value pairs "
                "it contains. This reflects request-parsing logic commonly "
                "handled by web frameworks and REST APIs."
            ),
            "difficulty": "medium",
            "tags": ["strings", "web", "rest api", "django", "fastapi"],
            "test_cases": [
                {"stdin": "name=John&age=25\n", "expected": "2"},
                {"stdin": "a=1\n", "expected": "1"},
                {"stdin": "a=1&b=2&c=3&d=4\n", "expected": "4"},
            ]
        },
        {
            "id": "http_status_category",
            "title": "HTTP Status Code Category",
            "description": (
                "Read an integer HTTP status code and print its category: "
                "'informational' (1xx), 'success' (2xx), 'redirect' (3xx), "
                "'client error' (4xx), or 'server error' (5xx)."
            ),
            "difficulty": "easy",
            "tags": ["web", "rest api", "fastapi", "django"],
            "test_cases": [
                {"stdin": "200\n", "expected": "success"},
                {"stdin": "404\n", "expected": "client error"},
                {"stdin": "500\n", "expected": "server error"},
            ]
        },
        {
            "id": "merge_sorted_arrays",
            "title": "Merge Two Sorted Arrays",
            "description": (
                "Read two lines, each a space-separated list of sorted "
                "integers. Print the merged result as a single sorted, "
                "space-separated list."
            ),
            "difficulty": "medium",
            "tags": ["arrays", "algorithms", "data structures"],
            "test_cases": [
                {"stdin": "1 3 5\n2 4 6\n", "expected": "1 2 3 4 5 6"},
                {"stdin": "1 2 3\n\n", "expected": "1 2 3"},
            ]
        },
        {
            "id": "binary_search",
            "title": "Binary Search",
            "description": (
                "Read a line of sorted space-separated integers, then a "
                "second line with a target integer. Print the index "
                "(0-based) of the target if found, otherwise print -1."
            ),
            "difficulty": "medium",
            "tags": ["arrays", "algorithms", "data structures"],
            "test_cases": [
                {"stdin": "1 3 5 7 9\n5\n", "expected": "2"},
                {"stdin": "1 3 5 7 9\n4\n", "expected": "-1"},
            ]
        },
        {
            "id": "docker_image_tag_validator",
            "title": "Valid Docker Image Tag",
            "description": (
                "Read a line of text. Print 'yes' if it is a valid Docker "
                "image tag (only lowercase letters, digits, dots, "
                "underscores, and hyphens, max 128 characters), otherwise "
                "print 'no'."
            ),
            "difficulty": "medium",
            "tags": ["strings", "docker", "devops"],
            "test_cases": [
                {"stdin": "my-app_v1.0\n", "expected": "yes"},
                {"stdin": "My App!\n", "expected": "no"},
            ]
        },
        {
            "id": "sql_where_counter",
            "title": "Count SQL WHERE Conditions",
            "description": (
                "Read a line representing the conditions after a SQL WHERE "
                "clause, joined by 'AND' (e.g. 'age > 18 AND active = 1'). "
                "Print how many individual conditions are present."
            ),
            "difficulty": "easy",
            "tags": ["sql", "strings"],
            "test_cases": [
                {"stdin": "age > 18 AND active = 1\n", "expected": "2"},
                {"stdin": "id = 5\n", "expected": "1"},
            ]
        },
        {
            "id": "matrix_transpose",
            "title": "Matrix Transpose",
            "description": (
                "Read an integer n, then n lines each with n "
                "space-separated integers (an n x n matrix). Print the "
                "transposed matrix, one row per line, space-separated."
            ),
            "difficulty": "hard",
            "tags": ["arrays", "algorithms", "math"],
            "test_cases": [
                {"stdin": "2\n1 2\n3 4\n", "expected": "1 3\n2 4"},
                {"stdin": "1\n5\n", "expected": "5"},
            ]
        },
    ]
}

# Per-language configuration: file extension, optional compile command,
# and run command. {src}, {bin}, {dir} are filled in at runtime.
LANGUAGE_CONFIG = {
    "python": {
        "filename": "solution.py",
        "compile": None,
        "run": [sys.executable, "{src}"],
    },
    "c": {
        "filename": "solution.c",
        "compile": ["gcc", "{src}", "-o", "{bin}"],
        "run": ["{bin}"],
    },
    "cpp": {
        "filename": "solution.cpp",
        "compile": ["g++", "{src}", "-o", "{bin}"],
        "run": ["{bin}"],
    },
    "java": {
        # Java requires the public class name to match the filename.
        "filename": "Main.java",
        "compile": ["javac", "{src}"],
        "run": ["java", "-cp", "{dir}", "Main"],
    },
    "javascript": {
        "filename": "solution.js",
        "compile": None,
        "run": ["node", "{src}"],
    },
}

SUPPORTED_LANGUAGES = list(LANGUAGE_CONFIG.keys())


# ------------------------------------------------------------------
# Starter code templates - generated per language + IO pattern, so a
# candidate only has to fill in solve(...) rather than write the
# input-reading/output-printing boilerplate from scratch.
# ------------------------------------------------------------------

def _python_template(pattern: str, output: str) -> str:
    reads = {
        "line_text": 's = input()\nresult = solve(s)',
        "int_list": 'arr = list(map(int, input().split()))\nresult = solve(arr)',
        "two_ints": 'a, b = map(int, input().split())\nresult = solve(a, b)',
        "single_int": 'n = int(input())\nresult = solve(n)',
        "two_lines": 's1 = input()\ns2 = input()\nresult = solve(s1, s2)',
    }
    params = {
        "line_text": "s", "int_list": "arr", "two_ints": "a, b",
        "single_int": "n", "two_lines": "s1, s2"
    }
    printer = 'print("yes" if result else "no")' if output == "yesno" else 'print(result)'
    return (
        f"def solve({params[pattern]}):\n"
        f"    # TODO: implement your logic here\n"
        f"    pass\n\n"
        f"{reads[pattern]}\n"
        f"{printer}\n"
    )


def _cpp_template(pattern: str, output: str) -> str:
    sig = {
        "line_text": "string solve(string s)",
        "int_list": "int solve(vector<int>& arr)",
        "two_ints": "int solve(int a, int b)",
        "single_int": "long long solve(int n)",
        "two_lines": "int solve(string s1, string s2)",
    }
    read_main = {
        "line_text": '    string s;\n    getline(cin, s);\n    auto result = solve(s);',
        "int_list": '    vector<int> arr;\n    int x;\n    while (cin >> x) arr.push_back(x);\n    auto result = solve(arr);',
        "two_ints": '    int a, b;\n    cin >> a >> b;\n    auto result = solve(a, b);',
        "single_int": '    int n;\n    cin >> n;\n    auto result = solve(n);',
        "two_lines": '    string s1, s2;\n    getline(cin, s1);\n    getline(cin, s2);\n    auto result = solve(s1, s2);',
    }
    printer = '    cout << (result ? "yes" : "no");' if output == "yesno" else '    cout << result;'
    return (
        f"#include <bits/stdc++.h>\nusing namespace std;\n\n"
        f"{sig[pattern]} {{\n    // TODO: implement your logic here\n\n}}\n\n"
        f"int main() {{\n{read_main[pattern]}\n{printer}\n    return 0;\n}}\n"
    )


def _java_template(pattern: str, output: str) -> str:
    read_main = {
        "line_text": '        String s = sc.nextLine();\n        var result = solve(s);',
        "int_list": '        List<Integer> arr = new ArrayList<>();\n        while (sc.hasNextInt()) arr.add(sc.nextInt());\n        var result = solve(arr);',
        "two_ints": '        int a = sc.nextInt();\n        int b = sc.nextInt();\n        var result = solve(a, b);',
        "single_int": '        int n = sc.nextInt();\n        var result = solve(n);',
        "two_lines": '        String s1 = sc.nextLine();\n        String s2 = sc.nextLine();\n        var result = solve(s1, s2);',
    }
    sig = {
        "line_text": "static Object solve(String s)",
        "int_list": "static Object solve(List<Integer> arr)",
        "two_ints": "static Object solve(int a, int b)",
        "single_int": "static Object solve(int n)",
        "two_lines": "static Object solve(String s1, String s2)",
    }
    printer = '        System.out.print(((Boolean) result) ? "yes" : "no");' if output == "yesno" \
        else '        System.out.print(result);'
    return (
        "import java.util.*;\n\npublic class Main {\n"
        f"    {sig[pattern]} {{\n        // TODO: implement your logic here\n        return null;\n    }}\n\n"
        "    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n"
        f"{read_main[pattern]}\n{printer}\n    }}\n}}\n"
    )


def _c_template(pattern: str, output: str) -> str:
    # C is kept simpler: the candidate fills in the solve logic directly
    # inside main(), since C has no generics/collections to abstract with.
    read_main = {
        "line_text": '    char s[1000];\n    fgets(s, sizeof(s), stdin);\n    // TODO: implement your logic on s, then print the result\n',
        "int_list": '    int arr[1000], n = 0, x;\n    while (scanf("%d", &x) == 1) arr[n++] = x;\n    // TODO: implement your logic on arr[0..n-1], then print the result\n',
        "two_ints": '    int a, b;\n    scanf("%d %d", &a, &b);\n    // TODO: implement your logic on a and b, then print the result\n',
        "single_int": '    int n;\n    scanf("%d", &n);\n    // TODO: implement your logic on n, then print the result\n',
        "two_lines": '    char s1[1000], s2[1000];\n    fgets(s1, sizeof(s1), stdin);\n    fgets(s2, sizeof(s2), stdin);\n    // TODO: implement your logic on s1 and s2, then print the result\n',
    }
    hint = '    // Print "yes" or "no" depending on your result\n' if output == "yesno" else '    // Print your final answer with printf\n'
    return (
        "#include <stdio.h>\n#include <string.h>\n\nint main() {\n"
        f"{read_main[pattern]}{hint}    return 0;\n}}\n"
    )


def _javascript_template(pattern: str, output: str) -> str:
    reads = {
        "line_text": 'const s = require("fs").readFileSync(0, "utf-8").split("\\n")[0].trim();\nconst result = solve(s);',
        "int_list": 'const arr = require("fs").readFileSync(0, "utf-8").trim().split(/\\s+/).map(Number);\nconst result = solve(arr);',
        "two_ints": 'const [a, b] = require("fs").readFileSync(0, "utf-8").trim().split(/\\s+/).map(Number);\nconst result = solve(a, b);',
        "single_int": 'const n = parseInt(require("fs").readFileSync(0, "utf-8").trim());\nconst result = solve(n);',
        "two_lines": 'const lines = require("fs").readFileSync(0, "utf-8").split("\\n");\nconst result = solve(lines[0].trim(), lines[1].trim());',
    }
    params = {
        "line_text": "s", "int_list": "arr", "two_ints": "a, b",
        "single_int": "n", "two_lines": "s1, s2"
    }
    printer = 'console.log(result ? "yes" : "no");' if output == "yesno" else 'console.log(result);'
    return (
        f"function solve({params[pattern]}) {{\n  // TODO: implement your logic here\n}}\n\n"
        f"{reads[pattern]}\n{printer}\n"
    )


_TEMPLATE_BUILDERS = {
    "python": _python_template,
    "cpp": _cpp_template,
    "java": _java_template,
    "c": _c_template,
    "javascript": _javascript_template,
}


def get_starter_code(question_id: str, language: str) -> dict:
    """
    Returns a starter code template for the given question + language,
    so the candidate only has to implement the core logic. Falls back
    to a generic message if the question hasn't been classified with
    an IO pattern yet.
    """
    language = language.lower().strip()
    meta = QUESTION_IO_META.get(question_id)

    if not meta:
        return {"starter_code": "// Write a full program that reads input from stdin and prints the answer to stdout."}

    if language not in _TEMPLATE_BUILDERS:
        return {"error": f"No starter template available for language '{language}'."}

    code = _TEMPLATE_BUILDERS[language](meta["pattern"], meta["output"])
    return {"starter_code": code}


def get_coding_question(role: str, question_id: str = None) -> dict:
    """Returns a coding question for the given role, or a specific one by id."""
    role = role.lower().strip()
    questions = CODING_QUESTIONS.get(role, CODING_QUESTIONS["python developer"])

    if question_id:
        for q in questions:
            if q["id"] == question_id:
                return q
        return {"error": "Question not found"}

    return questions[0]


def list_coding_questions(role: str, count: int = 5) -> list:
    """
    Returns a random subset of coding questions (titles + ids) for a role,
    so the candidate sees a different mix of questions each time without
    anyone needing to manually curate a new set.
    """
    role = role.lower().strip()
    questions = CODING_QUESTIONS.get(role, CODING_QUESTIONS["python developer"])
    selected = random.sample(questions, min(count, len(questions)))
    return [
        {"id": q["id"], "title": q["title"], "difficulty": q["difficulty"]}
        for q in selected
    ]


def get_coding_round(role: str = "python developer", skills: list = None) -> dict:
    """
    Builds one full coding round: a random Easy, Medium, and Hard question.

    If a list of skills is provided (e.g. extracted from a resume/JD via
    the skill-gap analysis), this prefers questions whose tags overlap
    with those skills - so a candidate whose JD mentions "Django" or
    "SQL" is more likely to see a coding question themed around that
    area. If no skill match is found for a difficulty level, it falls
    back to a plain random pick from that level, so a round is always
    produced.

    Returns a dict keyed by difficulty, each with id/title/description.
    """
    role = role.lower().strip()
    questions = CODING_QUESTIONS.get(role, CODING_QUESTIONS["python developer"])
    normalized_skills = set(s.lower().strip() for s in skills) if skills else set()

    round_set = {}
    for level in ["easy", "medium", "hard"]:
        pool = [q for q in questions if q["difficulty"] == level]
        if not pool:
            continue

        chosen = None
        if normalized_skills:
            matched_pool = [
                q for q in pool
                if normalized_skills.intersection(set(tag.lower() for tag in q.get("tags", [])))
            ]
            if matched_pool:
                chosen = random.choice(matched_pool)

        if chosen is None:
            chosen = random.choice(pool)

        round_set[level] = {
            "id": chosen["id"],
            "title": chosen["title"],
            "description": chosen["description"],
            "difficulty": chosen["difficulty"],
            "tags": chosen.get("tags", []),
            "matched_to_skills": bool(normalized_skills.intersection(set(tag.lower() for tag in chosen.get("tags", [])))),
            "starter_code": get_starter_code(chosen["id"], "python").get("starter_code", "")
        }

    return round_set


# Difficulty weighting for the combined round score - harder questions
# count for more, since solving them demonstrates stronger ability.
DIFFICULTY_WEIGHTS = {"easy": 1, "medium": 2, "hard": 3}


def score_coding_round(submissions: list) -> dict:
    """
    Combines results from multiple submit_code calls (one per difficulty)
    into a single weighted score and verdict for the whole coding round.

    Args:
        submissions: list of dicts, each like
            {"difficulty": "easy", "passed": 3, "total": 3}
            (i.e. the result of run_submitted_code for that question)

    Returns:
        dict with per-difficulty pass ratio, weighted final score, verdict
    """
    if not submissions:
        return {"error": "No submissions provided."}

    weighted_sum = 0
    weight_total = 0
    breakdown = []

    for sub in submissions:
        difficulty = sub.get("difficulty", "easy").lower()
        passed = sub.get("passed", 0)
        total = sub.get("total", 1) or 1
        ratio = passed / total  # 0.0 - 1.0
        weight = DIFFICULTY_WEIGHTS.get(difficulty, 1)

        weighted_sum += ratio * weight
        weight_total += weight

        breakdown.append({
            "difficulty": difficulty,
            "passed": passed,
            "total": total,
            "score_percent": round(ratio * 100, 1)
        })

    final_score = round((weighted_sum / weight_total) * 100, 1) if weight_total else 0

    if final_score >= 80:
        verdict = "Strong"
    elif final_score >= 50:
        verdict = "Moderate"
    else:
        verdict = "Weak"

    return {
        "breakdown": breakdown,
        "final_score": final_score,
        "verdict": verdict
    }


def _execute(language: str, user_code: str, stdin_text: str) -> tuple:
    """
    Writes the user's code to a temp file, compiles it if needed, and
    runs it with the given stdin. Returns (returncode, stdout, stderr).
    """
    config = LANGUAGE_CONFIG[language]

    with tempfile.TemporaryDirectory() as tmp_dir:
        src_path = os.path.join(tmp_dir, config["filename"])
        bin_path = os.path.join(tmp_dir, "solution.exe")

        with open(src_path, "w") as f:
            f.write(user_code)

        # Compile step (skipped for interpreted languages)
        if config["compile"]:
            compile_cmd = [
                part.format(src=src_path, bin=bin_path, dir=tmp_dir)
                for part in config["compile"]
            ]
            compile_proc = subprocess.run(
                compile_cmd, capture_output=True, text=True, timeout=15
            )
            if compile_proc.returncode != 0:
                return -1, "", f"Compilation Error:\n{compile_proc.stderr.strip()}"

        # Run step
        run_cmd = [
            part.format(src=src_path, bin=bin_path, dir=tmp_dir)
            for part in config["run"]
        ]
        run_proc = subprocess.run(
            run_cmd, input=stdin_text, capture_output=True, text=True, timeout=5
        )
        return run_proc.returncode, run_proc.stdout, run_proc.stderr


def run_submitted_code(user_code: str, question_id: str, language: str = "python",
                        role: str = "python developer") -> dict:
    """
    Runs the candidate's submitted code against all test cases for a
    question, in the chosen language.

    Returns a dict with the verdict and per-test-case results.
    """
    language = language.lower().strip()
    if language not in SUPPORTED_LANGUAGES:
        return {"error": f"Unsupported language '{language}'. Supported: {SUPPORTED_LANGUAGES}"}

    question = get_coding_question(role, question_id)
    if "error" in question:
        return question

    test_cases = question["test_cases"]
    results = []
    passed_count = 0

    for i, test in enumerate(test_cases):
        stdin_text = test["stdin"]
        expected = test["expected"].strip()

        try:
            returncode, stdout, stderr = _execute(language, user_code, stdin_text)

            if returncode != 0:
                results.append({
                    "test_number": i + 1,
                    "passed": False,
                    "error": stderr.strip()[-400:]
                })
                continue

            actual = stdout.strip()
            passed = actual == expected

            if passed:
                passed_count += 1

            results.append({
                "test_number": i + 1,
                "passed": passed,
                "input": stdin_text.strip(),
                "expected": expected,
                "actual": actual
            })

        except subprocess.TimeoutExpired:
            results.append({
                "test_number": i + 1,
                "passed": False,
                "error": "Time Limit Exceeded (code took too long - possible infinite loop)"
            })
        except FileNotFoundError:
            results.append({
                "test_number": i + 1,
                "passed": False,
                "error": f"Compiler/runtime for '{language}' is not installed on this system."
            })
        except Exception as e:
            results.append({
                "test_number": i + 1,
                "passed": False,
                "error": f"Could not evaluate: {str(e)}"
            })

    total = len(test_cases)
    if passed_count == total:
        verdict = "Accepted"
    elif passed_count > 0:
        verdict = "Wrong Answer"
    else:
        verdict = "Failed"

    return {
        "question_title": question["title"],
        "language": language,
        "passed": passed_count,
        "total": total,
        "verdict": verdict,
        "test_results": results
    }


# ---- FOR TESTING ----
if __name__ == "__main__":
    print("\n--- Coding Round Test (Multi-Language) ---\n")

    samples = {
        "python": "s = input()\nprint(s[::-1])",
        "c": """
#include <stdio.h>
#include <string.h>
int main() {
    char s[1000];
    scanf("%s", s);
    int len = strlen(s);
    for (int i = len - 1; i >= 0; i--) printf("%c", s[i]);
    return 0;
}
""",
        "cpp": """
#include <iostream>
#include <string>
#include <algorithm>
using namespace std;
int main() {
    string s;
    cin >> s;
    reverse(s.begin(), s.end());
    cout << s;
    return 0;
}
""",
        "java": """
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();
        System.out.print(new StringBuilder(s).reverse().toString());
    }
}
""",
        "javascript": """
const s = require('fs').readFileSync(0, 'utf-8').trim();
console.log(s.split('').reverse().join(''));
""",
    }

    for lang, code in samples.items():
        result = run_submitted_code(code, "reverse_string", language=lang)
        if "error" in result:
            print(f"[{lang}] ERROR: {result['error']}")
        else:
            print(f"[{lang}] {result['question_title']}: {result['verdict']} "
                  f"({result['passed']}/{result['total']})")
            for tr in result["test_results"]:
                if not tr["passed"] and "error" in tr:
                    print(f"    -> {tr['error'][:150]}")