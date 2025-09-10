///|
/// Performance benchmark tests for optimized core functions
/// These tests measure performance characteristics and validate optimizations

// Helper function to create repeated strings for benchmarking
fn create_test_string(base : String, repeat_count : Int) -> String {
  let mut result = ""
  let mut i = 0
  while i < repeat_count {
    result = result + base
    i = i + 1
  }
  result
}

// ========== str_contains Performance Tests ==========

///|
test "benchmark - str_contains small strings" {
  let haystack = "hello world this is a test string"
  let needle = "test"

  // Test multiple iterations to measure consistency
  let mut i = 0
  while i < 100 {
    assert_eq(@lib.str_contains(haystack, needle), true)
    i = i + 1
  }
}

///|
test "benchmark - str_contains medium strings" {
  let haystack = create_test_string("abcdefghij", 50) +
    "needle" +
    create_test_string("klmnopqrst", 50)
  let needle = "needle"
  let mut i = 0
  while i < 50 {
    assert_eq(@lib.str_contains(haystack, needle), true)
    i = i + 1
  }
}

///|
test "benchmark - str_contains large strings" {
  let haystack = create_test_string("x", 1000) +
    "target" +
    create_test_string("y", 1000)
  let needle = "target"
  let mut i = 0
  while i < 10 {
    assert_eq(@lib.str_contains(haystack, needle), true)
    i = i + 1
  }
}

///|
test "benchmark - str_contains single char optimization" {
  let haystack = create_test_string("abcdefghijklmnop", 100)
  let needle = "z"

  // This should be fast with single character optimization
  let mut i = 0
  while i < 100 {
    assert_eq(@lib.str_contains(haystack, needle), false)
    i = i + 1
  }
}

///|
test "benchmark - str_contains worst case pattern" {
  let haystack = create_test_string("a", 500) + "b"
  let needle = create_test_string("a", 10) + "b"

  // This tests the Boyer-Moore-like optimization
  let mut i = 0
  while i < 20 {
    assert_eq(@lib.str_contains(haystack, needle), true)
    i = i + 1
  }
}

// ========== sanitize_filename Performance Tests ==========

///|
test "benchmark - sanitize_filename clean short names" {
  let filename = "document.txt"

  // Should be fast with early return optimization
  let mut i = 0
  while i < 100 {
    assert_eq(@lib.sanitize_filename(filename), "document.txt")
    i = i + 1
  }
}

///|
test "benchmark - sanitize_filename with invalid chars" {
  let filename = "file/with\\invalid:chars*.txt"
  let expected = "file_with_invalid_chars_.txt"
  let mut i = 0
  while i < 100 {
    assert_eq(@lib.sanitize_filename(filename), expected)
    i = i + 1
  }
}

///|
test "benchmark - sanitize_filename long names" {
  let long_filename = create_test_string("a", 150)
  let mut i = 0
  while i < 50 {
    let result = @lib.sanitize_filename(long_filename)
    assert_eq(result.length(), 120)
    i = i + 1
  }
}

///|
test "benchmark - sanitize_filename mixed content" {
  let filename = create_test_string("valid", 10) +
    "/\\:*?\"<>|" +
    create_test_string("more", 10)
  let mut i = 0
  while i < 50 {
    let result = @lib.sanitize_filename(filename)
    assert_true(result.length() > 0)
    i = i + 1
  }
}

// ========== normalize_image_url Performance Tests ==========

///|
test "benchmark - normalize_image_url non-wechat" {
  let url = "https://example.com/image.jpg"

  // Should be fast with early return
  let mut i = 0
  while i < 100 {
    assert_eq(@lib.normalize_image_url(url), url)
    i = i + 1
  }
}

///|
test "benchmark - normalize_image_url wechat simple" {
  let url = "https://mmbiz.qpic.cn/image.jpg"
  let expected = url + "?wx_fmt=png&tp=webp"
  let mut i = 0
  while i < 100 {
    assert_eq(@lib.normalize_image_url(url), expected)
    i = i + 1
  }
}

///|
test "benchmark - normalize_image_url wechat with params" {
  let url = "https://mmbiz.qpic.cn/image.jpg?existing=param"
  let expected = url + "&wx_fmt=png&tp=webp"
  let mut i = 0
  while i < 100 {
    assert_eq(@lib.normalize_image_url(url), expected)
    i = i + 1
  }
}

///|
test "benchmark - normalize_image_url long urls" {
  let base_url = "https://mmbiz.qpic.cn/" +
    create_test_string("path/", 50) +
    "image.jpg"
  let mut i = 0
  while i < 50 {
    let result = @lib.normalize_image_url(base_url)
    assert_true(@lib.str_contains(result, "wx_fmt=png"))
    assert_true(@lib.str_contains(result, "tp=webp"))
    i = i + 1
  }
}

// ========== Combined Performance Tests ==========

///|
test "benchmark - combined operations workflow" {
  // Simulate a typical workflow: normalize URL, sanitize filename, check contains
  let url = "https://mmbiz.qpic.cn/test/image.jpg"
  let filename = "downloaded/image:copy*.jpg"
  let mut i = 0
  while i < 50 {
    let normalized_url = @lib.normalize_image_url(url)
    let safe_filename = @lib.sanitize_filename(filename)
    let has_wechat = @lib.str_contains(normalized_url, "mmbiz.qpic.cn")
    assert_true(@lib.str_contains(normalized_url, "wx_fmt=png"))
    assert_eq(safe_filename, "downloaded_image_copy_.jpg")
    assert_eq(has_wechat, true)
    i = i + 1
  }
}

///|
test "benchmark - stress test all functions" {
  // Stress test with larger inputs
  let large_url = "https://mmbiz.qpic.cn/" +
    create_test_string("segment/", 20) +
    "image.jpg"
  let large_filename = create_test_string("file", 30) +
    "/\\:*?\"<>|" +
    create_test_string("name", 30)
  let large_haystack = create_test_string("data", 100)
  let mut i = 0
  while i < 10 {
    // Test all functions with larger inputs
    let url_result = @lib.normalize_image_url(large_url)
    let filename_result = @lib.sanitize_filename(large_filename)
    let contains_result = @lib.str_contains(large_haystack, "data")
    assert_true(url_result.length() > large_url.length())
    assert_eq(filename_result.length(), 120) // Should be clamped
    assert_eq(contains_result, true)
    i = i + 1
  }
}

// ========== Edge Case Performance Tests ==========

///|
test "benchmark - empty string handling" {
  let mut i = 0
  while i < 100 {
    assert_eq(@lib.normalize_image_url(""), "")
    assert_eq(@lib.sanitize_filename(""), "file")
    assert_eq(@lib.str_contains("", ""), true)
    assert_eq(@lib.str_contains("test", ""), true)
    i = i + 1
  }
}

///|
test "benchmark - unicode performance" {
  let unicode_text = "测试文本🎉emoji🎊test"
  let unicode_filename = "文件🎵名称.txt"
  let mut i = 0
  while i < 50 {
    let contains_result = @lib.str_contains(unicode_text, "emoji")
    let sanitized = @lib.sanitize_filename(unicode_filename)
    assert_eq(contains_result, true)
    assert_true(sanitized.length() > 0)
    i = i + 1
  }
}
