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
