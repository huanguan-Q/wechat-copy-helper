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

///|
/// New joined-ABI batch exports
/// These call functions defined in src/main/exports.mbt
test "exports - batch normalize_image_urls_joined" {
  let sep = "|SEP|"
  let input = "https://example.com/a.png|SEP|https://mmbiz.qpic.cn/path/img"
  let want = "https://example.com/a.png|SEP|https://mmbiz.qpic.cn/path/img?wx_fmt=png&tp=webp"
  assert_eq(normalize_image_urls_joined(input, sep), want)
}

///|
test "exports - batch sanitize_filenames_joined" {
  let sep = "|SEP|"
  let input = "a/b|SEP|c*?.png"
  let want = "a_b|SEP|c__.png"
  assert_eq(sanitize_filenames_joined(input, sep), want)
}

///|
test "exports - batch escape_htmls_joined" {
  let sep = "|SEP|"
  let input = "a&b|SEP|<x>"
  let want = "a&amp;b|SEP|&lt;x&gt;"
  assert_eq(escape_htmls_joined(input, sep), want)
}

///|
test "exports - batch escape_attrs_joined" {
  let sep = "|SEP|"
  let input = "Tom's|SEP|A&B"
  let want = "Tom&#39;s|SEP|A&amp;B"
  assert_eq(escape_attrs_joined(input, sep), want)
}

///|
test "exports - batch normalize_image_urls_joined - empty input yields empty" {
  let sep = "|SEP|"
  let input = ""
  let want = ""
  assert_eq(normalize_image_urls_joined(input, sep), want)
}

///|
test "exports - batch normalize_image_urls_joined - adds missing params only" {
  let sep = "|SEP|"
  let a = "https://mmbiz.qpic.cn/aa/bb"
  let b = "https://mmbiz.qpic.cn/img?wx_fmt=png"
  let input = a + sep + b
  let want = "https://mmbiz.qpic.cn/aa/bb?wx_fmt=png&tp=webp" +
    sep +
    "https://mmbiz.qpic.cn/img?wx_fmt=png&tp=webp"
  assert_eq(normalize_image_urls_joined(input, sep), want)
}

///|
test "exports - batch sanitize_filenames_joined - long clamp and unicode preserved" {
  let sep = "|SEP|"
  let input = repeat_char('/', 200) + sep + "文档V1"
  let want = repeat_char('_', 120) + sep + "文档V1"
  assert_eq(sanitize_filenames_joined(input, sep), want)
}

///|
test "exports - batch escape_htmls_joined - multiple specials" {
  let sep = "|SEP|"
  let input = "a&b<c>" + sep + "x>y&z"
  let want = "a&amp;b&lt;c&gt;" + sep + "x&gt;y&amp;z"
  assert_eq(escape_htmls_joined(input, sep), want)
}

///|
test "exports - batch escape_attrs_joined - quotes and amp" {
  let sep = "|SEP|"
  let input = "\"A'&" + sep + "B\"C'D"
  let want = "&quot;A&#39;&amp;" + sep + "B&quot;C&#39;D"
  assert_eq(escape_attrs_joined(input, sep), want)
}

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
