class APIError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  OCR_FAILED: 'OCR_FAILED',
  LLM_FAILED: 'LLM_FAILED',
  MSGCHECK_FAILED: 'MSGCHECK_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INVALID_PARAMS: 'INVALID_PARAMS',
  NOT_FOUND: 'NOT_FOUND',
};

module.exports = { APIError, ErrorCodes };
