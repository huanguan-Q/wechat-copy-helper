/// Black-box tests for core public APIs

// normalize_image_url tests

test "normalize - non wechat unchanged" {
  inspect(normalize_image_url("https://example.com/a.png"), content="https://example.com/a.png")
}

test "normalize - add both when none and no query" {
  let url = "https://mmbiz.qpic.cn/path/img"
  inspect(
    normalize_image_url(url),
    content="https://mmbiz.qpic.cn/path/img?wx_fmt=png&tp=webp",
  )
}

test "normalize - add both when none and has query" {
  let url = "https://mmbiz.qpic.cn/path/img?x=1"
  inspect(
    normalize_image_url(url),
    content="https://mmbiz.qpic.cn/path/img?x=1&wx_fmt=png&tp=webp",
  )
}

test "normalize - only add tp when wx_fmt exists" {
  let url = "https://mmbiz.qpic.cn/a/b.png?wx_fmt=jpeg"
  inspect(
    normalize_image_url(url),
    content="https://mmbiz.qpic.cn/a/b.png?wx_fmt=jpeg&tp=webp",
  )
}

test "normalize - only add wx_fmt when tp exists" {
  let url = "https://mmbiz.qpic.cn/a/b.png?tp=webp"
  inspect(
    normalize_image_url(url),
    content="https://mmbiz.qpic.cn/a/b.png?tp=webp&wx_fmt=png",
  )
}

test "normalize - unchanged when both present" {
  let url = "https://mmbiz.qpic.cn/a/b.png?tp=webp&wx_fmt=png"
  inspect(normalize_image_url(url), content=url)
}

// decide_referrer_policy tests

test "policy - wechat cdn uses no-referrer-when-downgrade" {
  inspect(
    decide_referrer_policy("https://mmbiz.qpic.cn/a/b.png"),
    content="no-referrer-when-downgrade",
  )
}

test "policy - non wechat uses no-referrer" {
  inspect(
    decide_referrer_policy("https://example.com/a/b.png"),
    content="no-referrer",
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

// sanitize_filename tests

test "sanitize - empty becomes file" {
  inspect(sanitize_filename(""), content="file")
}

test "sanitize - replace invalid ascii" {
  inspect(sanitize_filename("a/b\\c:d*e?f\"g<h>i|j"), content="a_b_c_d_e_f_g_h_i_j")
}

test "sanitize - emoji becomes underscores" {
  // '🙂' is a surrogate pair; current implementation replaces each unit with '_'
  inspect(sanitize_filename("A🙂B"), content="A__B")
}

test "sanitize - clamp to 120 chars" {
  let long = repeat('x', 130)
  let want = repeat('x', 120)
  inspect(sanitize_filename(long), content=want)
}
