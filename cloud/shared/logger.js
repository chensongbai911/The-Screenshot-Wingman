function log (level, message, data = {}) {
  console[level]({ level, message, ...data, timestamp: new Date().toISOString() });
}

module.exports = {
  info: (msg, data) => log('log', msg, data),
  warn: (msg, data) => log('warn', msg, data),
  error: (msg, data) => log('error', msg, data),
};
