const { APIError, ErrorCodes } = require('./error');
const cloud = require('wx-server-sdk');

function ensureAuth () {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    throw new APIError(ErrorCodes.UNAUTHORIZED, '未授权的请求');
  }
  return OPENID;
}

module.exports = { ensureAuth };
