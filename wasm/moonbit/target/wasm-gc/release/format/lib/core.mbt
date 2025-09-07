/// Core library for URL normalization, referrer policy decision, and filename sanitization.
/// NOTE: Logic parity with JS fallback in wasmLoader.js is required when possible.

///|
/// Return true if `haystack` contains `needle` as a UTF-16 code-unit substring (ASCII-safe).
fn str_contains(haystack : String, needle : String) -> Bool {
  let hl = haystack.length()
  let nl = needle.length()
  if nl == 0 {
    return true
  }
  let mut i = 0
  while i + nl <= hl {
    let mut j = 0
    let mut ok = true
    while j < nl {
      if haystack[i + j] != needle[j] {
        ok = false
        break
      }
      j = j + 1
    }
    if ok {
      return true
    }
    i = i + 1
  }
  false
}

///|
/// Normalize WeChat image URLs from mmbiz.qpic.cn by appending default params when missing: wx_fmt=png and tp=webp.
/// If the URL does not belong to mmbiz.qpic.cn or already contains both params, the input is returned unchanged.
pub fn normalize_image_url(input : String) -> String {
  if input.length() == 0 {
    return input
  }
  let host = "mmbiz.qpic.cn"
  if !str_contains(input, host) {
    return input
  }
  let has_wx = str_contains(input, "wx_fmt=")
  let has_tp = str_contains(input, "tp=")
  if has_wx && has_tp {
    return input
  }
  let has_q = str_contains(input, "?")
  let mut sep = if has_q { "&" } else { "?" }
  let mut suffix = ""
  if !has_wx {
    suffix = suffix + sep + "wx_fmt=png"
    sep = "&"
  }
  if !has_tp {
    suffix = suffix + sep + "tp=webp"
  }
  input + suffix
}

///|
/// Decide referrer policy string based on whether the URL belongs to mmbiz.qpic.cn.
/// Returns "no-referrer-when-downgrade" for WeChat CDN, otherwise "no-referrer".
pub fn decide_referrer_policy(input : String) -> String {
  if str_contains(input, "mmbiz.qpic.cn") {
    "no-referrer-when-downgrade"
  } else {
    "no-referrer"
  }
}

///|
/// Sanitize a filename by replacing invalid characters with '_' and clamping length to 120 code units.
/// If input is empty, defaults to "file".
pub fn sanitize_filename(name : String) -> String {
  let base = if name.length() == 0 { "file" } else { name }
  // Invalid set: / \ : * ? " < > |
  let mut i = 0
  let mut out = ""
  let mut count = 0
  while i < base.length() && count < 120 {
    let code = base[i]
    // ASCII checks by code unit
    if code == ('/' : Int) ||
      code == ('\\' : Int) ||
      code == (':' : Int) ||
      code == ('*' : Int) ||
      code == ('?' : Int) ||
      code == ('\"' : Int) ||
      code == ('<' : Int) ||
      code == ('>' : Int) ||
      code == ('|' : Int) {
      out = out + "_"
      i = i + 1
      count = count + 1
      continue
    }
    // Convert current code unit to Char if possible; otherwise replace with '_'
    match code.to_char() {
      Some(c) => {
        out = out + c.to_string()
        i = i + 1
        count = count + 1
      }
      None => {
        // Unpaired surrogate, replace and advance one unit
        out = out + "_"
        i = i + 1
        count = count + 1
      }
    }
  }
  out
}
