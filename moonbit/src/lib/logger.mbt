///|
/// Logging and error handling utilities for core functions
/// Provides structured logging and error tracking capabilities

///|
/// Log levels for different types of messages
enum LogLevel {
  Debug
  Info
  Warn
  Error
}

///|
/// Convert log level to string representation
fn log_level_to_string(level : LogLevel) -> String {
  match level {
    Debug => "DEBUG"
    Info => "INFO"
    Warn => "WARN"
    Error => "ERROR"
  }
}

///|
/// Error types for core functions
enum CoreError {
  InvalidInput(String)
  ProcessingError(String)
  PerformanceWarning(String)
}

///|
/// Convert error to string representation
pub fn error_to_string(error : CoreError) -> String {
  match error {
    InvalidInput(msg) => "Invalid Input: " + msg
    ProcessingError(msg) => "Processing Error: " + msg
    PerformanceWarning(msg) => "Performance Warning: " + msg
  }
}

///|
/// Logging configuration structure
struct LogConfig {
  enabled : Bool
  level : LogLevel
}

///|
/// Default logging configuration
let default_log_config : LogConfig = { enabled: false, level: Info }

///|
/// Check if a log level should be output
fn should_log(config : LogConfig, level : LogLevel) -> Bool {
  if !config.enabled {
    return false
  }
  match (config.level, level) {
    (Debug, _) => true
    (Info, Info) | (Info, Warn) | (Info, Error) => true
    (Warn, Warn) | (Warn, Error) => true
    (Error, Error) => true
    _ => false
  }
}

///|
/// Log a message with specified level
fn log_message(
  config : LogConfig,
  level : LogLevel,
  function_name : String,
  message : String,
) -> Unit {
  if !should_log(config, level) {
    return
  }

  // In WASM environment, we can't directly use console.log
  // This would need to be handled by the JS wrapper
  // For now, we'll format the message for potential JS consumption
  let formatted = "[" +
    log_level_to_string(level) +
    "] " +
    function_name +
    ": " +
    message

  // TODO: In a real implementation, this would call out to JS
  // For now, we'll just store it or ignore it
  ()
}

///|
/// Log debug message
pub fn log_debug(function_name : String, message : String) -> Unit {
  log_message(default_log_config, Debug, function_name, message)
}

///|
/// Log info message
pub fn log_info(function_name : String, message : String) -> Unit {
  log_message(default_log_config, Info, function_name, message)
}

///|
/// Log warning message
pub fn log_warn(function_name : String, message : String) -> Unit {
  log_message(default_log_config, Warn, function_name, message)
}

///|
/// Log error message
pub fn log_error(function_name : String, message : String) -> Unit {
  log_message(default_log_config, Error, function_name, message)
}

///|
/// Log performance metrics
pub fn log_performance(
  function_name : String,
  input_size : Int,
  operation : String,
) -> Unit {
  if input_size > 1000 {
    log_warn(
      function_name,
      "Large input size (" + input_size.to_string() + ") for " + operation,
    )
  } else {
    log_debug(
      function_name,
      "Processing " + operation + " with size " + input_size.to_string(),
    )
  }
}

///|
/// Validate input and log errors
pub fn validate_string_input(
  function_name : String,
  input : String,
  max_length : Int,
) -> Result[Unit, CoreError] {
  if input.length() > max_length {
    let error = PerformanceWarning(
      "Input length (" +
      input.length().to_string() +
      ") exceeds recommended maximum (" +
      max_length.to_string() +
      ")",
    )
    log_warn(function_name, error_to_string(error))
    return Err(error)
  }
  log_debug(
    function_name,
    "Input validation passed for length " + input.length().to_string(),
  )
  Ok(())
}

///|
/// Measure and log execution time (simplified)
pub fn[T] with_timing(
  function_name : String,
  operation : String,
  f : () -> T,
) -> T {
  log_debug(function_name, "Starting " + operation)
  let result = f()
  log_debug(function_name, "Completed " + operation)
  result
}

///|
/// Log function entry with parameters
pub fn log_function_entry(function_name : String, params : String) -> Unit {
  log_debug(function_name, "Entry with params: " + params)
}

///|
/// Log function exit with result info
pub fn log_function_exit(function_name : String, result_info : String) -> Unit {
  log_debug(function_name, "Exit with result: " + result_info)
}

///|
/// Create a safe string representation for logging (truncated if too long)
fn safe_string_for_log(s : String, max_len : Int) -> String {
  if s.length() <= max_len {
    s
  } else {
    s.substring(end=max_len) + "...[truncated]"
  }
}

///|
/// Log input/output for debugging
pub fn log_io_debug(
  function_name : String,
  input : String,
  output : String,
) -> Unit {
  let safe_input = safe_string_for_log(input, 50)
  let safe_output = safe_string_for_log(output, 50)
  log_debug(
    function_name,
    "Input: '" + safe_input + "' -> Output: '" + safe_output + "'",
  )
}
