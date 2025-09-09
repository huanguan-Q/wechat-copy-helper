///|
/// Black-box tests for core public APIs
test "normalize - non wechat unchanged" {
  assert_eq(
    normalize_image_url("https://example.com/a.png"),
    "https://example.com/a.png",
  )
}

///|
test "normalize - add both when none and no query" {
  let url = "https://mmbiz.qpic.cn/path/img"
  assert_eq(
    @lib.normalize_image_url(url),
    "https://mmbiz.qpic.cn/path/img?wx_fmt=png&tp=webp",
  )
}

///|
test "normalize - add both when none and has query" {
  let url = "https://mmbiz.qpic.cn/path/img?x=1"
  assert_eq(
    @lib.normalize_image_url(url),
    "https://mmbiz.qpic.cn/path/img?x=1&wx_fmt=png&tp=webp",
  )
}

///|
test "normalize - only add tp when wx_fmt exists" {
  let url = "https://mmbiz.qpic.cn/a/b.png?wx_fmt=jpeg"
  assert_eq(
    @lib.normalize_image_url(url),
    "https://mmbiz.qpic.cn/a/b.png?wx_fmt=jpeg&tp=webp",
  )
}

///|
test "normalize - only add wx_fmt when tp exists" {
  let url = "https://mmbiz.qpic.cn/a/b.png?tp=webp"
  assert_eq(
    @lib.normalize_image_url(url),
    "https://mmbiz.qpic.cn/a/b.png?tp=webp&wx_fmt=png",
  )
}

///|
test "normalize - unchanged when both present" {
  let url = "https://mmbiz.qpic.cn/a/b.png?tp=webp&wx_fmt=png"
  assert_eq(@lib.normalize_image_url(url), url)
}

///|
test "policy - wechat cdn uses no-referrer-when-downgrade" {
  assert_eq(
    @lib.decide_referrer_policy("https://mmbiz.qpic.cn/a/b.png"),
    "no-referrer-when-downgrade",
  )
}

///|
test "policy - non wechat uses no-referrer" {
  assert_eq(
    @lib.decide_referrer_policy("https://example.com/a/b.png"),
    "no-referrer",
  )
}

///|
fn repeat(c : Char, n : Int) -> String {
  let mut s = ""
  let mut i = 0
  while i < n {
    s = s + c.to_string()
    i = i + 1
  }
  s
}

///|
test "sanitize - empty becomes file" {
  assert_eq(@lib.sanitize_filename(""), "file")
}

///|
test "sanitize - replace invalid ascii" {
  assert_eq(
    @lib.sanitize_filename("a/b\\c:d*e?f\"g<h>i|j"),
    "a_b_c_d_e_f_g_h_i_j",
  )
}

///|
test "sanitize - emoji becomes underscores" {
  // '🙂' is a surrogate pair; current implementation replaces each unit with '_'
  assert_eq(@lib.sanitize_filename("A🙂B"), "A__B")
}

///|
test "sanitize - clamp to 120 chars" {
  let long = repeat('x', 130)
  let want = repeat('x', 120)
  assert_eq(@lib.sanitize_filename(long), want)
}

///|
test "escape_html - basic entities" {
  assert_eq(@lib.escape_html("a&b<c>d"), "a&amp;b&lt;c&gt;d")
}

///|
test "escape_html - quotes remain intact" {
  assert_eq(@lib.escape_html("\"'"), "\"'")
}

// ===== Edge cases from core_edge_cases_test.mbt (merged) =====

// normalize_image_url edge cases

///|
test "normalize - uppercase host unchanged" {
  assert_eq(
    @lib.normalize_image_url("https://MMBIZ.QPIC.CN/a.png"),
    "https://MMBIZ.QPIC.CN/a.png",
  )
}

///|
test "normalize - trailing question mark adds & then params" {
  let url = "https://mmbiz.qpic.cn/img?"
  assert_eq(
    @lib.normalize_image_url(url),
    "https://mmbiz.qpic.cn/img?&wx_fmt=png&tp=webp",
  )
}

///|
test "normalize - wx_fmt empty adds only tp" {
  let url = "https://mmbiz.qpic.cn/a?wx_fmt="
  assert_eq(
    @lib.normalize_image_url(url),
    "https://mmbiz.qpic.cn/a?wx_fmt=&tp=webp",
  )
}

///|
test "normalize - tp present (non-webp) adds only wx_fmt" {
  let url = "https://mmbiz.qpic.cn/a?tp=jpeg"
  assert_eq(
    @lib.normalize_image_url(url),
    "https://mmbiz.qpic.cn/a?tp=jpeg&wx_fmt=png",
  )
}

///|
test "normalize - empty input unchanged" {
  assert_eq(@lib.normalize_image_url(""), "")
}

// decide_referrer_policy edge cases

///|
test "policy - empty input uses no-referrer" {
  assert_eq(@lib.decide_referrer_policy(""), "no-referrer")
}

// sanitize_filename edge cases

///|
test "sanitize - only invalid ascii become underscores" {
  // Invalid set: / \ : * ? " < > |
  let s = '/'.to_string() +
    '\\'.to_string() +
    ':'.to_string() +
    '*'.to_string() +
    '?'.to_string() +
    '"'.to_string() +
    '<'.to_string() +
    '>'.to_string() +
    '|'.to_string()
  assert_eq(@lib.sanitize_filename(s), "_________")
}

///|
test "sanitize - unicode preserved" {
  assert_eq(@lib.sanitize_filename("文档V1"), "文档V1")
}

///|
test "sanitize - long invalid chars clamp to 120" {
  let s = repeat('/', 200)
  let want = repeat('_', 120)
  assert_eq(@lib.sanitize_filename(s), want)
}

///|
test "sanitize - exactly 120 length kept" {
  let s = repeat('x', 120)
  assert_eq(@lib.sanitize_filename(s), s)
}

// ===== str_contains tests (merged) =====

///|
/// Tests for internal helper `str_contains`
test "str_contains - empty needle true for non-empty" {
  assert_eq(@lib.str_contains("abc", ""), true)
}

///|
test "str_contains - empty needle true for empty" {
  assert_eq(@lib.str_contains("", ""), true)
}

///|
test "str_contains - empty haystack and non-empty needle false" {
  assert_eq(@lib.str_contains("", "a"), false)
}

///|
test "str_contains - match at start" {
  assert_eq(@lib.str_contains("abc", "ab"), true)
}

///|
test "str_contains - match in middle" {
  assert_eq(@lib.str_contains("abcde", "cd"), true)
}

///|
test "str_contains - match at end" {
  assert_eq(@lib.str_contains("abc", "bc"), true)
}

///|
test "str_contains - no match" {
  assert_eq(@lib.str_contains("abc", "x"), false)
}

///|
test "str_contains - needle longer than haystack" {
  assert_eq(@lib.str_contains("ab", "abc"), false)
}

///|
test "str_contains - overlapping pattern" {
  // "aaaab" contains "aaab" starting at index 1
  assert_eq(@lib.str_contains("aaaab", "aaab"), true)
}

///|
test "str_contains - unicode code unit preserved" {
  assert_eq(@lib.str_contains("ab文cd", "文"), true)
}

///|
test "str_contains - large haystack scan" {
  let mut s = ""
  let mut i = 0
  while i < 200 {
    s = s + "a"
    i = i + 1
  }
  assert_eq(@lib.str_contains(s, "aab"), false)
  assert_eq(@lib.str_contains(s + "b", "aab"), true)
}

///|
test "escape_html - surrogate pair becomes underscores" {
  assert_eq(@lib.escape_html("A🙂B"), "A__B")
}

///|
test "escape_attr - basic entities incl quotes" {
  let input = "Tom's \"hat\" & <tag>"
  let want = "Tom&#39;s &quot;hat&quot; &amp; &lt;tag&gt;"
  assert_eq(@lib.escape_attr(input), want)
}

///|
test "escape_attr - surrogate pair becomes underscores" {
  assert_eq(@lib.escape_attr("A🙂B"), "A__B")
}

///|
test "ensure_wechat_cdn_params - parity with normalize_image_url" {
  let url1 = "https://example.com/a.png"
  assert_eq(@lib.ensure_wechat_cdn_params(url1), @lib.normalize_image_url(url1))
  let url2 = "https://mmbiz.qpic.cn/a/b.png"
  assert_eq(@lib.ensure_wechat_cdn_params(url2), @lib.normalize_image_url(url2))
  let url3 = "https://mmbiz.qpic.cn/a/b.png?wx_fmt=jpeg"
  assert_eq(@lib.ensure_wechat_cdn_params(url3), @lib.normalize_image_url(url3))
}
