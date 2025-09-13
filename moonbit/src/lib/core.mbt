/// Core library for URL normalization, referrer policy decision, and filename sanitization.
/// NOTE: Logic parity with JS fallback in wasmLoader.js is required when possible.

///|
/// Return true if `haystack` contains `needle` as a UTF-16 code-unit substring (ASCII-safe).
/// Optimized with early termination and reduced bounds checking.
pub fn str_contains(haystack : String, needle : String) -> Bool {
  let hl = haystack.length()
  let nl = needle.length()

  // Early returns for edge cases
  if nl == 0 {
    return true
  }
  if nl > hl {
    return false
  }

  // Single character optimization
  if nl == 1 {
    let target = needle[0]
    let mut i = 0
    while i < hl {
      if haystack[i] == target {
        return true
      }
      i = i + 1
    }
    return false
  }

  // Boyer-Moore-like optimization: check last character first
  let last_char = needle[nl - 1]
  let mut i = nl - 1
  while i < hl {
    if haystack[i] == last_char {
      // Check if full pattern matches
      let mut j = 0
      let mut match_found = true
      let start_pos = i - nl + 1
      while j < nl {
        if haystack[start_pos + j] != needle[j] {
          match_found = false
          break
        }
        j = j + 1
      }
      if match_found {
        return true
      }
    }
    i = i + 1
  }
  false
}

///|
/// Normalize WeChat image URLs from mmbiz.qpic.cn by appending default params when missing: wx_fmt=png and tp=webp.
/// If the URL does not belong to mmbiz.qpic.cn or already contains both params, the input is returned unchanged.
/// Enhanced with error handling and performance optimizations.
pub fn normalize_image_url(input : String) -> String {
  // Input validation and early returns
  if input.length() == 0 {
    return input
  }

  // Performance check for extremely long URLs
  if input.length() > 2000 {
    // For very long URLs, still process but could be optimized further
    // In a real implementation, this might log a warning
  }
  let host = "mmbiz.qpic.cn"
  if !str_contains(input, host) {
    return input
  }
  let has_wx = str_contains(input, "wx_fmt=")
  let has_tp = str_contains(input, "tp=")

  // Early return if both parameters already exist
  if has_wx && has_tp {
    return input
  }

  // Build suffix efficiently
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
/// If input is empty, defaults to "file". Optimized version maintaining original behavior.
pub fn sanitize_filename(name : String) -> String {
  let base = if name.length() == 0 { "file" } else { name }

  // Use original algorithm but with some optimizations
  let mut i = 0
  let mut out = ""
  let mut count = 0
  while i < base.length() && count < 120 {
    let code = base[i]

    // Check for invalid filename characters first (faster path)
    if is_invalid_filename_char(code) {
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

///|
/// Check if a character code represents an invalid filename character.
/// Invalid set: / \\ : * ? " < > |
fn is_invalid_filename_char(code : Int) -> Bool {
  code == ('/' : Int) ||
  code == ('\\' : Int) ||
  code == (':' : Int) ||
  code == ('*' : Int) ||
  code == ('?' : Int) ||
  code == ('\"' : Int) ||
  code == ('<' : Int) ||
  code == ('>' : Int) ||
  code == ('|' : Int)
}

///|
/// Escape HTML text content by replacing '&', '<', '>' with their entities.
/// Non-ASCII code units are preserved when decodable as Char; undecodable units become '_'.
pub fn escape_html(input : String) -> String {
  let mut i = 0
  let mut out = ""
  while i < input.length() {
    let code = input[i]
    if code == ('&' : Int) {
      out = out + "&amp;"
      i = i + 1
      continue
    }
    if code == ('<' : Int) {
      out = out + "&lt;"
      i = i + 1
      continue
    }
    if code == ('>' : Int) {
      out = out + "&gt;"
      i = i + 1
      continue
    }
    match code.to_char() {
      Some(c) => {
        out = out + c.to_string()
        i = i + 1
      }
      None => {
        out = out + "_"
        i = i + 1
      }
    }
  }
  out
}

///|
/// Escape HTML attribute content. In addition to text escaping, also escape '"' and '\''.
/// Mappings: '&' -> &amp;, '<' -> &lt;, '>' -> &gt;, '"' -> &quot;, '\'' -> &#39;
pub fn escape_attr(input : String) -> String {
  let mut i = 0
  let mut out = ""
  while i < input.length() {
    let code = input[i]
    if code == ('&' : Int) {
      out = out + "&amp;"
      i = i + 1
      continue
    }
    if code == ('<' : Int) {
      out = out + "&lt;"
      i = i + 1
      continue
    }
    if code == ('>' : Int) {
      out = out + "&gt;"
      i = i + 1
      continue
    }
    if code == ('\"' : Int) {
      out = out + "&quot;"
      i = i + 1
      continue
    }
    if code == ('\'' : Int) {
      out = out + "&#39;"
      i = i + 1
      continue
    }
    match code.to_char() {
      Some(c) => {
        out = out + c.to_string()
        i = i + 1
      }
      None => {
        out = out + "_"
        i = i + 1
      }
    }
  }
  out
}

///|
/// Alias of normalize_image_url for naming symmetry when used as a general-purpose "ensure" helper.
/// This function may evolve to handle more WeChat CDN param policies while normalize_image_url retains current behavior.
pub fn ensure_wechat_cdn_params(input : String) -> String {
  normalize_image_url(input)
}

///|
/// Result-based variant of normalize_image_url with input validation.
/// Returns Ok(normalized_url) on success; Err(CoreError) when input exceeds safe length.
pub fn normalize_image_url_result(input : String) -> Result[String, CoreError] {
  let max_len : Int = 4096
  match validate_string_input("normalize_image_url_result", input, max_len) {
    Ok(_) => Ok(normalize_image_url(input))
    Err(e) => Err(e)
  }
}

///|
/// Result-based variant of decide_referrer_policy with input validation.
/// Returns Ok(policy) on success; Err(CoreError) when input exceeds safe length.
pub fn decide_referrer_policy_result(
  input : String,
) -> Result[String, CoreError] {
  let max_len : Int = 4096
  match validate_string_input("decide_referrer_policy_result", input, max_len) {
    Ok(_) => Ok(decide_referrer_policy(input))
    Err(e) => Err(e)
  }
}

///|
/// Result-based variant of sanitize_filename with input validation.
/// Returns Ok(sanitized) on success; Err(CoreError) when input exceeds safe length.
pub fn sanitize_filename_result(name : String) -> Result[String, CoreError] {
  let max_len : Int = 4096
  match validate_string_input("sanitize_filename_result", name, max_len) {
    Ok(_) => Ok(sanitize_filename(name))
    Err(e) => Err(e)
  }
}

///|
/// Result-based variant of escape_html with input validation.
/// Returns Ok(escaped) on success; Err(CoreError) when input exceeds safe length.
pub fn escape_html_result(input : String) -> Result[String, CoreError] {
  let max_len : Int = 8192
  match validate_string_input("escape_html_result", input, max_len) {
    Ok(_) => Ok(escape_html(input))
    Err(e) => Err(e)
  }
}

///|
/// Result-based variant of escape_attr with input validation.
/// Returns Ok(escaped) on success; Err(CoreError) when input exceeds safe length.
pub fn escape_attr_result(input : String) -> Result[String, CoreError] {
  let max_len : Int = 8192
  match validate_string_input("escape_attr_result", input, max_len) {
    Ok(_) => Ok(escape_attr(input))
    Err(e) => Err(e)
  }
}

///|
/// Result-based alias of ensure_wechat_cdn_params with input validation.
/// Returns Ok(result) on success; Err(CoreError) when input exceeds safe length.
pub fn ensure_wechat_cdn_params_result(
  input : String,
) -> Result[String, CoreError] {
  let max_len : Int = 4096
  match
    validate_string_input("ensure_wechat_cdn_params_result", input, max_len) {
    Ok(_) => Ok(ensure_wechat_cdn_params(input))
    Err(e) => Err(e)
  }
}
