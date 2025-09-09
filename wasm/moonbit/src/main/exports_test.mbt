///|
/// Sanity tests for exported entry points in src/main/exports.mbt
test "exports - normalize passthrough non wechat" {
  assert_eq(
    @lib.normalize_image_url("https://example.com/a.png"),
    "https://example.com/a.png",
  )
}

///|
test "exports - policy wechat" {
  assert_eq(
    @lib.decide_referrer_policy("https://mmbiz.qpic.cn/a/b.png"),
    "no-referrer-when-downgrade",
  )
}

///|
test "exports - sanitize" {
  assert_eq(@lib.sanitize_filename("a/b"), "a_b")
}

///|
test "exports - escape_html" {
  assert_eq(@lib.escape_html("a&b<c>d"), "a&amp;b&lt;c&gt;d")
}

///|
test "exports - escape_attr" {
  let input = "Tom's \"hat\" & <tag>"
  let want = "Tom&#39;s &quot;hat&quot; &amp; &lt;tag&gt;"
  assert_eq(@lib.escape_attr(input), want)
}

///|
test "exports - ensure_wechat_cdn_params" {
  let url = "https://mmbiz.qpic.cn/path/img"
  assert_eq(
    @lib.ensure_wechat_cdn_params(url),
    "https://mmbiz.qpic.cn/path/img?wx_fmt=png&tp=webp",
  )
}
