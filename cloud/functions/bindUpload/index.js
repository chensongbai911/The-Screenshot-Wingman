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

exports.main = async (event = {}) => {
  try {
    const openid = ensureAuth();
    const { taskId, fileId } = event;

    if (!taskId || !fileId) {
      throw new APIError(ErrorCodes.INVALID_PARAMS, 'taskId 与 fileId 必填');
    }

    const taskRes = await db.collection('analysis_tasks').doc(taskId).get().catch(() => null);
    if (!taskRes || !taskRes.data) {
      throw new APIError(ErrorCodes.NOT_FOUND, '任务不存在');
    }
    if (taskRes.data.openid !== openid) {
      throw new APIError(ErrorCodes.UNAUTHORIZED, '无权操作此任务');
    }

    const now = new Date();
    await db.collection('analysis_tasks').doc(taskId).update({
      data: {
        image: { fileId, uploadedAt: now },
        status: 'uploaded',
        updatedAt: now,
      },
    });

    return ok({ taskId, status: 'uploaded', uploadedAt: now });
  } catch (error) {
    console.error('bindUpload error:', error);

    if (error instanceof APIError) {
      return { code: error.code, message: error.message, details: error.details };
    }

    return { code: ErrorCodes.DATABASE_ERROR, message: '服务器错误', error: error.message };
  }
};
