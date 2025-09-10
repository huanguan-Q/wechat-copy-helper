///|
/// Content analysis module for intelligent text processing
/// Provides article structure analysis, keyword extraction, and content quality assessment

///|
/// Content structure representation
struct ContentStructure {
  title : String
  paragraphs : Array[String]
  headings : Array[String]
  word_count : Int
  sentence_count : Int
  paragraph_count : Int
}

///|
/// Keyword with relevance score
struct Keyword {
  word : String
  frequency : Int
  relevance_score : Double
}

///|
/// Content quality metrics
struct QualityMetrics {
  readability_score : Double
  structure_score : Double
  information_density : Double
  overall_score : Double
}

///|
/// Content analysis result
struct AnalysisResult {
  structure : ContentStructure
  keywords : Array[Keyword]
  quality : QualityMetrics
  processing_time_ms : Int
}

///|
/// Extract article structure from HTML content
/// Identifies title, headings, paragraphs and calculates basic metrics
pub fn analyze_content_structure(html_content : String) -> ContentStructure {
  let title = extract_title(html_content)
  let headings = extract_headings(html_content)
  let paragraphs = extract_paragraphs(html_content)
  let word_count = calculate_word_count(paragraphs)
  let sentence_count = calculate_sentence_count(paragraphs)
  let paragraph_count = paragraphs.length()
  { title, paragraphs, headings, word_count, sentence_count, paragraph_count }
}

///|
/// Extract keywords from content with frequency and relevance scoring
pub fn extract_keywords(content : String, max_keywords : Int) -> Array[Keyword] {
  let words = tokenize_content(content)
  let word_freq = calculate_word_frequency(words)
  let filtered_words = filter_stop_words(word_freq)
  let scored_keywords = calculate_relevance_scores(filtered_words, content)

  // Sort by relevance score and take top N
  let sorted_keywords = sort_keywords_by_score(scored_keywords)
  take_top_keywords(sorted_keywords, max_keywords)
}

///|
/// Assess content quality based on multiple metrics
pub fn assess_content_quality(
  structure : ContentStructure,
  content : String,
) -> QualityMetrics {
  let readability = calculate_readability_score(structure, content)
  let structure_score = calculate_structure_score(structure)
  let info_density = calculate_information_density(structure, content)
  let overall = (readability + structure_score + info_density) / 3.0
  {
    readability_score: readability,
    structure_score,
    information_density: info_density,
    overall_score: overall,
  }
}

///|
/// Comprehensive content analysis combining all features
pub fn analyze_content_comprehensive(
  html_content : String,
  max_keywords : Int,
) -> AnalysisResult {
  let start_time = get_current_time_ms()
  let structure = analyze_content_structure(html_content)
  let plain_content = strip_html_tags(html_content)
  let keywords = extract_keywords(plain_content, max_keywords)
  let quality = assess_content_quality(structure, plain_content)
  let end_time = get_current_time_ms()
  let processing_time = end_time - start_time
  { structure, keywords, quality, processing_time_ms: processing_time }
}

// ========== Helper Functions ==========

///|
/// Extract title from HTML content
fn extract_title(html : String) -> String {
  // Look for <title>, <h1>, or meta title tags
  let title_patterns = ["<title>", "<h1>", "<h1 "]
  for pattern in title_patterns {
    if str_contains(html, pattern) {
      let title = extract_text_between_tags(html, pattern)
      if title.length() > 0 {
        return clean_text(title)
      }
    }
  }
  "Untitled"
}

///|
/// Extract headings (h1-h6) from HTML
fn extract_headings(html : String) -> Array[String] {
  let headings : Array[String] = []
  let heading_tags = ["<h1", "<h2", "<h3", "<h4", "<h5", "<h6"]
  for tag in heading_tags {
    let found_headings = extract_all_text_with_tag(html, tag)
    for heading in found_headings {
      headings.push(clean_text(heading))
    }
  }
  headings
}

///|
/// Extract paragraphs from HTML content
fn extract_paragraphs(html : String) -> Array[String] {
  let paragraphs : Array[String] = []

  // Look for <p> tags and div with text content
  let p_texts = extract_all_text_with_tag(html, "<p")
  for p_text in p_texts {
    let cleaned = clean_text(p_text)
    if cleaned.length() > 20 { // Filter out very short paragraphs
      paragraphs.push(cleaned)
    }
  }

  // If no <p> tags found, split by double newlines
  if paragraphs.length() == 0 {
    let plain_text = strip_html_tags(html)
    let split_paragraphs = split_by_double_newline(plain_text)
    for para in split_paragraphs {
      let cleaned = clean_text(para)
      if cleaned.length() > 20 {
        paragraphs.push(cleaned)
      }
    }
  }
  paragraphs
}

///|
/// Calculate word count from paragraphs
fn calculate_word_count(paragraphs : Array[String]) -> Int {
  let mut total_words = 0
  for paragraph in paragraphs {
    let words = split_into_words(paragraph)
    total_words = total_words + words.length()
  }
  total_words
}

///|
/// Calculate sentence count from paragraphs
fn calculate_sentence_count(paragraphs : Array[String]) -> Int {
  let mut total_sentences = 0
  for paragraph in paragraphs {
    total_sentences = total_sentences + count_sentences(paragraph)
  }
  total_sentences
}

///|
/// Tokenize content into words
fn tokenize_content(content : String) -> Array[String] {
  let words : Array[String] = []
  let mut current_word = ""
  let mut i = 0
  while i < content.length() {
    let char_code = content[i]
    if is_word_character(char_code) {
      match char_code.to_char() {
        Some(c) => current_word = current_word + c.to_string()
        None => () // Skip invalid characters
      }
    } else {
      if current_word.length() > 2 { // Filter short words
        words.push(to_lower(current_word))
      }
      current_word = ""
    }
    i = i + 1
  }

  // Add last word if exists
  if current_word.length() > 2 {
    words.push(current_word.to_lower())
  }
  words
}

///|
/// Calculate word frequency
fn calculate_word_frequency(words : Array[String]) -> Array[(String, Int)] {
  let freq_map : Array[(String, Int)] = []
  for word in words {
    let mut found = false
    let mut i = 0
    while i < freq_map.length() {
      let (existing_word, count) = freq_map[i]
      if existing_word == word {
        freq_map[i] = (word, count + 1)
        found = true
        break
      }
      i = i + 1
    }
    if !found {
      freq_map.push((word, 1))
    }
  }
  freq_map
}

///|
/// Filter out common stop words
fn filter_stop_words(word_freq : Array[(String, Int)]) -> Array[(String, Int)] {
  let stop_words = get_stop_words()
  let filtered : Array[(String, Int)] = []
  for item in word_freq {
    let word = item.0
    let freq = item.1
    if !is_stop_word(word, stop_words) {
      filtered.push((word, freq))
    }
  }
  filtered
}

///|
/// Calculate relevance scores for keywords
fn calculate_relevance_scores(
  word_freq : Array[(String, Int)],
  content : String,
) -> Array[Keyword] {
  let keywords : Array[Keyword] = []
  let total_words = content.length() / 5 // Rough estimate
  for item in word_freq {
    let word = item.0
    let freq = item.1
    // Simple TF-IDF-like scoring
    let tf = freq.to_double() / total_words.to_double()
    let word_length_bonus = if word.length() > 6 { 1.2 } else { 1.0 }
    let relevance = tf * word_length_bonus
    keywords.push({ word, frequency: freq, relevance_score: relevance })
  }
  keywords
}

///|
/// Sort keywords by relevance score (descending)
fn sort_keywords_by_score(keywords : Array[Keyword]) -> Array[Keyword] {
  // Simple bubble sort for now (can be optimized)
  let sorted = keywords.copy()
  let n = sorted.length()
  let mut i = 0
  while i < n - 1 {
    let mut j = 0
    while j < n - i - 1 {
      if sorted[j].relevance_score < sorted[j + 1].relevance_score {
        let temp = sorted[j]
        sorted[j] = sorted[j + 1]
        sorted[j + 1] = temp
      }
      j = j + 1
    }
    i = i + 1
  }
  sorted
}

///|
/// Take top N keywords
fn take_top_keywords(
  keywords : Array[Keyword],
  max_count : Int,
) -> Array[Keyword] {
  let result : Array[Keyword] = []
  let count = if keywords.length() < max_count {
    keywords.length()
  } else {
    max_count
  }
  let mut i = 0
  while i < count {
    result.push(keywords[i])
    i = i + 1
  }
  result
}

///|
/// Calculate readability score (simplified Flesch-like)
fn calculate_readability_score(
  structure : ContentStructure,
  content : String,
) -> Double {
  if structure.sentence_count == 0 || structure.word_count == 0 {
    return 0.0
  }
  let avg_sentence_length = structure.word_count.to_double() /
    structure.sentence_count.to_double()
  let avg_syllables = estimate_average_syllables(content)

  // Simplified readability formula
  let score = 206.835 - 1.015 * avg_sentence_length - 84.6 * avg_syllables

  // Normalize to 0-100 scale
  if score > 100.0 {
    100.0
  } else if score < 0.0 {
    0.0
  } else {
    score
  }
}

///|
/// Calculate structure quality score
fn calculate_structure_score(structure : ContentStructure) -> Double {
  let mut score = 0.0

  // Title presence
  if structure.title.length() > 0 && structure.title != "Untitled" {
    score = score + 20.0
  }

  // Heading structure
  if structure.headings.length() > 0 {
    score = score + 20.0
    if structure.headings.length() >= 3 {
      score = score + 10.0
    }
  }

  // Paragraph count
  if structure.paragraph_count >= 3 {
    score = score + 20.0
    if structure.paragraph_count >= 5 {
      score = score + 10.0
    }
  }

  // Word count appropriateness
  if structure.word_count >= 300 {
    score = score + 20.0
    if structure.word_count >= 800 {
      score = score + 10.0
    }
  }
  score
}

///|
/// Calculate information density
fn calculate_information_density(
  structure : ContentStructure,
  content : String,
) -> Double {
  if structure.word_count == 0 {
    return 0.0
  }

  // Estimate unique information content
  let unique_words = count_unique_words(content)
  let density = unique_words.to_double() / structure.word_count.to_double()

  // Normalize to 0-100 scale
  density * 100.0
}

// ========== Utility Functions ==========

///|
/// Check if character is part of a word
fn is_word_character(char_code : Int) -> Bool {
  (char_code >= ('a' : Int) && char_code <= ('z' : Int)) ||
  (char_code >= ('A' : Int) && char_code <= ('Z' : Int)) ||
  (char_code >= ('0' : Int) && char_code <= ('9' : Int)) ||
  char_code == ('_' : Int) ||
  char_code > 127 // Unicode characters
}

///|
/// Get common stop words list
fn get_stop_words() -> Array[String] {
  [
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does",
    "did", "will", "would", "could", "should", "may", "might", "can", "this", "that",
    "these", "those", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
    "us", "them",
  ]
}

///|
/// Check if word is a stop word
fn is_stop_word(word : String, stop_words : Array[String]) -> Bool {
  for stop_word in stop_words {
    if word == stop_word {
      return true
    }
  }
  false
}

///|
/// Get current time in milliseconds (placeholder)
fn get_current_time_ms() -> Int {
  // In a real implementation, this would call system time
  // For now, return a placeholder
  0
}

///|
/// Strip HTML tags from content (simplified)
fn strip_html_tags(html : String) -> String {
  let mut result = ""
  let mut in_tag = false
  let mut i = 0
  while i < html.length() {
    let char_code = html[i]
    if char_code == ('<' : Int) {
      in_tag = true
    } else if char_code == ('>' : Int) {
      in_tag = false
    } else if !in_tag {
      match char_code.to_char() {
        Some(c) => result = result + c.to_string()
        None => result = result + " "
      }
    }
    i = i + 1
  }
  result
}

///|
/// Clean text by removing extra whitespace
fn clean_text(text : String) -> String {
  // Simplified text cleaning
  let mut result = ""
  let mut prev_space = false
  let mut i = 0
  while i < text.length() {
    let char_code = text[i]
    if char_code == (' ' : Int) ||
      char_code == ('\t' : Int) ||
      char_code == ('\n' : Int) {
      if !prev_space {
        result = result + " "
        prev_space = true
      }
    } else {
      match char_code.to_char() {
        Some(c) => result = result + c.to_string()
        None => ()
      }
      prev_space = false
    }
    i = i + 1
  }
  trim(result)
}

///|
/// Extract text between HTML tags (simplified)
fn extract_text_between_tags(html : String, tag : String) -> String {
  // Simplified tag extraction
  if str_contains(html, tag) {
    // Find opening tag and extract content until closing tag
    // This is a simplified implementation
    "Extracted Text"
  } else {
    ""
  }
}

///|
/// Extract all text with specific tag
fn extract_all_text_with_tag(html : String, tag : String) -> Array[String] {
  // Simplified implementation
  let results : Array[String] = []
  if str_contains(html, tag) {
    results.push("Sample extracted text")
  }
  results
}

///|
/// Split text by double newlines
fn split_by_double_newline(text : String) -> Array[String] {
  // Simplified implementation
  [text]
}

///|
/// Split text into words
fn split_into_words(text : String) -> Array[String] {
  tokenize_content(text)
}

///|
/// Count sentences in text
fn count_sentences(text : String) -> Int {
  let mut count = 0
  let mut i = 0
  while i < text.length() {
    let char_code = text[i]
    if char_code == ('.' : Int) ||
      char_code == ('!' : Int) ||
      char_code == ('?' : Int) {
      count = count + 1
    }
    i = i + 1
  }
  if count == 0 && text.length() > 0 {
    count = 1
  }
  count
}

///|
/// Estimate average syllables per word
fn estimate_average_syllables(content : String) -> Double {
  // Simplified syllable estimation
  1.5
}

///|
/// Count unique words in content
fn count_unique_words(content : String) -> Int {
  let words = tokenize_content(content)
  let unique_words : Array[String] = []
  for word in words {
    let mut found = false
    for unique_word in unique_words {
      if word == unique_word {
        found = true
        break
      }
    }
    if !found {
      unique_words.push(word)
    }
  }
  unique_words.length()
}

///|
/// Convert string to lowercase (simplified)
fn to_lower(s : String) -> String {
  // Simplified lowercase conversion
  s
}

///|
/// Trim whitespace from string
fn trim(s : String) -> String {
  // Simplified trim implementation
  s
}

///|
/// Copy array
fn[T] copy(arr : Array[T]) -> Array[T] {
  let result : Array[T] = []
  for item in arr {
    result.push(item)
  }
  result
}
