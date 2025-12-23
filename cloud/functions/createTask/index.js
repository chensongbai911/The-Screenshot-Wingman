const cloud = require('wx-server-sdk');
const { ensureAuth } = require('../../shared/auth');
const { APIError, ErrorCodes } = require('../../shared/error');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ok = (data = {}) => ({
  code: 0,
  message: 'success',
  data,
  timestamp: new Date().toISOString(),
});

exports.main = async (event = {}, context) => {
  try {
    const openid = ensureAuth();
    const { relationType = null, goalType = null } = event;

    const now = new Date();
    const addRes = await db.collection('analysis_tasks').add({
      openid,
      status: 'created',
      relationType,
      goalType,
      createdAt: now,
      updatedAt: now,
    });

    return ok({ taskId: addRes._id, status: 'created', createdAt: now });
  } catch (error) {
    console.error('createTask error:', error);

    if (error instanceof APIError) {
      return { code: error.code, message: error.message, details: error.details };
    }

    return { code: ErrorCodes.DATABASE_ERROR, message: '服务器错误', error: error.message };
  }
};
