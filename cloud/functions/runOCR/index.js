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
    const { taskId } = event;

    if (!taskId) {
      throw new APIError(ErrorCodes.INVALID_PARAMS, 'taskId 必填');
    }

    const taskRes = await db.collection('analysis_tasks').doc(taskId).get().catch(() => null);
    if (!taskRes || !taskRes.data) {
      throw new APIError(ErrorCodes.NOT_FOUND, '任务不存在');
    }
    if (taskRes.data.openid !== openid) {
      throw new APIError(ErrorCodes.UNAUTHORIZED, '无权操作此任务');
    }
    if (taskRes.data.status !== 'uploaded') {
      throw new APIError(ErrorCodes.INVALID_PARAMS, '任务未处于 uploaded 状态');
    }

    // TODO: 调用真实 OCR 服务；此处返回占位结果确保前端链路可用
    const mockMessages = [
      { role: 'them', text: '你在忙吗？', confidence: 0.95 },
      { role: 'me', text: '稍等，等下回你', confidence: 0.92 },
    ];

    const ocrResult = {
      messages: mockMessages,
      needRoleFix: false,
      confidence: 0.93,
      rawResponse: { mock: true },
    };

    const now = new Date();
    await db.collection('analysis_tasks').doc(taskId).update({
      data: {
        ocr: ocrResult,
        status: 'ocr_done',
        updatedAt: now,
      },
    });

    return ok(ocrResult);
  } catch (error) {
    console.error('runOCR error:', error);

    if (error instanceof APIError) {
      return { code: error.code, message: error.message, details: error.details };
    }

    return { code: ErrorCodes.OCR_FAILED, message: 'OCR 处理失败', error: error.message };
  }
};
