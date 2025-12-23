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

const isMock = () => String(process.env.MOCK_OCR || '').toLowerCase() === 'true';
const getOcrServiceConfig = () => ({
  service: process.env.OCR_SERVICE_ID,
  api: process.env.OCR_API_NAME || 'imgtotext',
});

const parseMessages = (records = []) => {
  // 根据常见 OCR 返回结构做轻量适配；若字段不存在则返回 empty
  const msgs = Array.isArray(records) ? records : [];
  return msgs.map((m) => ({
    role: m.role || 'unknown',
    text: m.text || m.content || '',
    confidence: Number(m.confidence || m.score || 0.9),
    position: m.position || { x: m.x || 0, y: m.y || 0 },
  })).filter((m) => m.text);
};

const mockOcr = () => ({
  messages: [
    { role: 'them', text: '你在忙吗？', confidence: 0.95 },
    { role: 'me', text: '稍等，等下回你', confidence: 0.92 },
  ],
  needRoleFix: false,
  confidence: 0.93,
  rawResponse: { mock: true },
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
    if (!taskRes.data.image || !taskRes.data.image.fileId) {
      throw new APIError(ErrorCodes.INVALID_PARAMS, '缺少图片 fileId');
    }

    let ocrResult;
    const now = new Date();

    if (isMock()) {
      ocrResult = mockOcr();
    } else {
      const { service, api } = getOcrServiceConfig();
      if (!service) {
        // 配置缺失时回退 mock，避免阻断链路
        ocrResult = mockOcr();
      } else {
        // 真实 OCR 调用（微信服务市场示例）。如使用其他厂商，可调整 data 字段。
        const resp = await cloud.openapi.serviceMarket.invokeService({
          service,
          api,
          data: {
            fileID: taskRes.data.image.fileId,
          },
        });

        // 常见返回结构：resp.data (buffer) 或 resp.resp_data (stringified JSON)
        let raw = resp?.data || resp?.resp_data || resp || {};
        try {
          if (typeof raw === 'string') raw = JSON.parse(raw);
        } catch (_) {
          // ignore parse errors, keep raw
        }

        const messages = parseMessages(raw?.messages || raw?.data || raw?.result || []);
        const needRoleFix = false; // 可根据坐标或模型结果再判断
        const confidence = messages.length ? Math.min(1, messages.reduce((s, m) => s + (m.confidence || 0), 0) / messages.length) : 0;

        ocrResult = {
          messages,
          needRoleFix,
          confidence,
          rawResponse: raw,
        };
      }
    }

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
