// Black-box edge-case tests for core public APIs

///|
fn repeat_char(c : Char, n : Int) -> String {
  let mut s = ""
  let mut i = 0
  while i < n {
    s = s + c.to_string()
    i = i + 1
  }
  s
}

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

// ========== Additional Edge Cases for Optimized Functions ==========

///|
test "str_contains - empty needle always true" {
  assert_eq(@lib.str_contains("", ""), true)
  assert_eq(@lib.str_contains("hello", ""), true)
}

///|
test "str_contains - needle longer than haystack" {
  assert_eq(@lib.str_contains("hi", "hello"), false)
}

///|
test "str_contains - single char optimization" {
  assert_eq(@lib.str_contains("hello", "h"), true)
  assert_eq(@lib.str_contains("hello", "o"), true)
  assert_eq(@lib.str_contains("hello", "x"), false)
}

///|
test "str_contains - repeated patterns" {
  assert_eq(@lib.str_contains("aaaaaaa", "aaa"), true)
  assert_eq(@lib.str_contains("abababab", "bab"), true)
}

///|
test "str_contains - unicode support" {
  assert_eq(@lib.str_contains("你好世界", "世界"), true)
  assert_eq(@lib.str_contains("🎉🎊🎈", "🎊"), true)
}

///|
test "sanitize_filename - empty defaults to file" {
  assert_eq(@lib.sanitize_filename(""), "file")
}

///|
test "sanitize_filename - clean filename unchanged" {
  assert_eq(@lib.sanitize_filename("document.txt"), "document.txt")
  assert_eq(@lib.sanitize_filename("image_001.jpg"), "image_001.jpg")
}

///|
test "sanitize_filename - all invalid chars" {
  assert_eq(@lib.sanitize_filename("/\\:*?\"<>|"), "_________")
}

///|
test "sanitize_filename - length limit 120" {
  let long_name = repeat_char('a', 150)
  let result = @lib.sanitize_filename(long_name)
  assert_eq(result.length(), 120)
}

///|
test "sanitize_filename - unicode handling" {
  // ASCII characters are preserved
  assert_eq(@lib.sanitize_filename("document.txt"), "document.txt")
  // Emoji and surrogate pairs become underscores (original behavior)
  assert_eq(@lib.sanitize_filename("🎉party🎊.jpg"), "__party__.jpg")
}

///|
test "decide_referrer_policy - empty string" {
  assert_eq(@lib.decide_referrer_policy(""), "no-referrer")
}

///|
test "decide_referrer_policy - case sensitive" {
  assert_eq(
    @lib.decide_referrer_policy("https://MMBIZ.QPIC.CN/image.jpg"),
    "no-referrer",
  )
}

///|
test "normalize - very long url" {
  let base = "https://mmbiz.qpic.cn/" + repeat_char('a', 500)
  let expected = base + "?wx_fmt=png&tp=webp"
  assert_eq(@lib.normalize_image_url(base), expected)
}

///|
test "performance - str_contains long haystack" {
  let haystack = repeat_char('a', 1000) + "needle" + repeat_char('b', 1000)
  assert_eq(@lib.str_contains(haystack, "needle"), true)
  assert_eq(@lib.str_contains(haystack, "missing"), false)
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
  assert_eq(@lib.sanitize_filename("/\\:*?\"<>|"), "_________")
}

///|
test "sanitize - unicode preserved" {
  assert_eq(@lib.sanitize_filename("文档V1"), "文档V1")
}

///|
test "sanitize - long invalid chars clamp to 120" {
  let s = repeat_char('/', 200)
  let want = repeat_char('_', 120)
  assert_eq(@lib.sanitize_filename(s), want)
}

///|
test "sanitize - exactly 120 length kept" {
  let s = repeat_char('x', 120)
  assert_eq(@lib.sanitize_filename(s), s)
}
