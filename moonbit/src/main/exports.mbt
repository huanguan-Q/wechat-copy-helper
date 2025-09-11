/// WASM-GC export shim using JS String builtins: expose String->String functions directly to JS hosts.
/// Exports: normalize_image_url, decide_referrer_policy, sanitize_filename, escape_html, escape_attr, ensure_wechat_cdn_params

///|
/// Normalize image URL according to WeChat CDN rules.
pub fn normalize_image_url(input : String) -> String {
  @lib.normalize_image_url(input)
}

///|
/// Decide referrer policy based on URL host.
pub fn decide_referrer_policy(input : String) -> String {
  @lib.decide_referrer_policy(input)
}

///|
/// Sanitize filename by replacing invalid characters and clamping length.
pub fn sanitize_filename(input : String) -> String {
  @lib.sanitize_filename(input)
}

///|
/// Escape HTML text content by replacing &, <, >.
pub fn escape_html(input : String) -> String {
  @lib.escape_html(input)
}

///|
/// Escape HTML attribute content by replacing &, <, >, ' and ".
pub fn escape_attr(input : String) -> String {
  @lib.escape_attr(input)
}

///|
/// Ensure WeChat CDN params (wx_fmt, tp) are present when applicable.
pub fn ensure_wechat_cdn_params(input : String) -> String {
  @lib.ensure_wechat_cdn_params(input)
}

// ===== Batch join/split helpers (shim-only, keep simple) =====

///|
/// Check if string `s` starts with `pat` at position `pos` (by code unit)
fn starts_with_at(s : String, pat : String, pos : Int) -> Bool {
  let sl = s.length()
  let pl = pat.length()
  if pl == 0 {
    return true
  }
  if pos + pl > sl {
    return false
  }
  let mut j = 0
  while j < pl {
    if s[pos + j] != pat[j] {
      return false
    }
    j = j + 1
  }
  true
}

///|
/// Split `input` by separator `sep` into an array (UTF-16 code unit based)
fn split_by_sep(input : String, sep : String) -> Array[String] {
  if sep.length() == 0 {
    return [input]
  }
  let out : Array[String] = []
  let mut cur = ""
  let mut i = 0
  while i < input.length() {
    if starts_with_at(input, sep, i) {
      out.push(cur)
      cur = ""
      i = i + sep.length()
      continue
    }
    let code = input[i]
    match code.to_char() {
      Some(c) => cur = cur + c.to_string()
      None => cur = cur + "_"
    }
    i = i + 1
  }
  out.push(cur)
  out
}

///|
/// Join string array with separator `sep`
fn join_with_sep(items : Array[String], sep : String) -> String {
  let mut out = ""
  let mut first = true
  for it in items {
    if first {
      out = out + it
      first = false
    } else {
      out = out + sep + it
    }
  }
  out
}

// ===== Batch exports using joined-string ABI (for JS host) =====

///|
/// Normalize multiple image URLs in one call. Input and output are joined by `sep`.
pub fn normalize_image_urls_joined(joined : String, sep : String) -> String {
  let arr = split_by_sep(joined, sep)
  let res = @lib.quick_batch_normalize_urls(arr)
  join_with_sep(res, sep)
}

///|
/// Sanitize multiple filenames in one call. Input and output are joined by `sep`.
pub fn sanitize_filenames_joined(joined : String, sep : String) -> String {
  let arr = split_by_sep(joined, sep)
  let res = @lib.quick_batch_sanitize_filenames(arr)
  join_with_sep(res, sep)
}

///|
/// Escape multiple HTML texts in one call. Input and output are joined by `sep`.
pub fn escape_htmls_joined(joined : String, sep : String) -> String {
  let arr = split_by_sep(joined, sep)
  let out : Array[String] = []
  for s in arr {
    out.push(@lib.escape_html(s))
  }
  join_with_sep(out, sep)
}

///|
/// Escape multiple HTML attributes in one call. Input and output are joined by `sep`.
pub fn escape_attrs_joined(joined : String, sep : String) -> String {
  let arr = split_by_sep(joined, sep)
  let out : Array[String] = []
  for s in arr {
    out.push(@lib.escape_attr(s))
  }
  join_with_sep(out, sep)
}

// Dummy main required when package is marked as is-main

///|
fn main {

}
