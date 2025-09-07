// Black-box tests for core public APIs
test "normalize - non wechat unchanged" {
  assert_eq(@lib.normalize_image_url("https://example.com/a.png"), "https://example.com/a.png")
}

test "normalize - add both when none and no query" {
  let url = "https://mmbiz.qpic.cn/path/img"
  assert_eq(
    @lib.normalize_image_url(url),
    "https://mmbiz.qpic.cn/path/img?wx_fmt=png&tp=webp",
  )
}

test "normalize - add both when none and has query" {
  let url = "https://mmbiz.qpic.cn/path/img?x=1"
  assert_eq(
    @lib.normalize_image_url(url),
    "https://mmbiz.qpic.cn/path/img?x=1&wx_fmt=png&tp=webp",
  )
}

test "normalize - only add tp when wx_fmt exists" {
  let url = "https://mmbiz.qpic.cn/a/b.png?wx_fmt=jpeg"
  assert_eq(
    @lib.normalize_image_url(url),
    "https://mmbiz.qpic.cn/a/b.png?wx_fmt=jpeg&tp=webp",
  )
}

test "normalize - only add wx_fmt when tp exists" {
  let url = "https://mmbiz.qpic.cn/a/b.png?tp=webp"
  assert_eq(
    @lib.normalize_image_url(url),
    "https://mmbiz.qpic.cn/a/b.png?tp=webp&wx_fmt=png",
  )
}

test "normalize - unchanged when both present" {
  let url = "https://mmbiz.qpic.cn/a/b.png?tp=webp&wx_fmt=png"
  assert_eq(@lib.normalize_image_url(url), url)
}

test "policy - wechat cdn uses no-referrer-when-downgrade" {
  assert_eq(
    @lib.decide_referrer_policy("https://mmbiz.qpic.cn/a/b.png"),
    "no-referrer-when-downgrade",
  )
}

test "policy - non wechat uses no-referrer" {
  assert_eq(
    @lib.decide_referrer_policy("https://example.com/a/b.png"),
    "no-referrer",
  )
}

fn repeat(c: Char, n: Int) -> String {
  let mut s = ""
  let mut i = 0
  while i < n {
    s = s + c.to_string()
    i = i + 1
  }
  s
}

test "sanitize - empty becomes file" {
  assert_eq(@lib.sanitize_filename(""), "file")
}

test "sanitize - replace invalid ascii" {
  assert_eq(@lib.sanitize_filename("a/b\\c:d*e?f\"g<h>i|j"), "a_b_c_d_e_f_g_h_i_j")
}

test "sanitize - emoji becomes underscores" {
  // '🙂' is a surrogate pair; current implementation replaces each unit with '_'
  assert_eq(@lib.sanitize_filename("A🙂B"), "A__B")
}

test "sanitize - clamp to 120 chars" {
  let long = repeat('x', 130)
  let want = repeat('x', 120)
  assert_eq(@lib.sanitize_filename(long), want)
}