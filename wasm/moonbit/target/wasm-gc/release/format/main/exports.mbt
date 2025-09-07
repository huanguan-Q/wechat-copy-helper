/// WASM-GC export shim using JS String builtins: expose String->String functions directly to JS hosts.
/// Exports: normalize_image_url, decide_referrer_policy, sanitize_filename

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

// Dummy main required when package is marked as is-main

///|
fn main {

}
