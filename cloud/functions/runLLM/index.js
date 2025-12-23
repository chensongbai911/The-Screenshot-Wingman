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

const isMock = () => String(process.env.MOCK_LLM || '').toLowerCase() === 'true';

const buildPrompt = (messages = [], relationType, goalType) => {
  const msgText = messages.map((m) => `${m.role === 'me' ? '我' : '对方'}: ${m.text}`).join('\n');
  const relation = relationType || '未知';
  const goal = goalType || '未知';

  return `你是一位情感沟通专家。请根据以下聊天记录进行分析：

关系类型：${relation}
用户目标：${goal}

聊天记录：
${msgText}

请以 JSON 格式返回分析结果，包含以下字段：
- profile_one_liner: 一句话心理侧写
- emotion: 情绪评分数组 [{"label": "兴奋度", "score": 0-100}, ...]
- intent: 意图推断数组 [{"label": "试探", "score": 0-100}, ...]
- strategy: 策略建议数组 [string]
- replies: 三种风格回复 [{"style": "风格名", "text": "回复文案", "note": "适用场景"}]
- next_steps: 下一步建议数组 [string]

JSON:`;
};

const mockLlmResult = () => ({
  profile_one_liner: '对你有好感但防御心强，需要更多主动信号',
  emotion: [
    { label: '兴奋度', score: 45 },
    { label: '防御度', score: 65 },
  ],
  intent: [{ label: '试探', score: 70 }],
  strategy: ['不要主动认输', '保持神秘感', '给予期待感'],
  replies: [
    { style: '高冷推拉型', text: '忙完再聊，先把手上的事做完', note: '保持矜持' },
    { style: '幽默调侃型', text: '这么关心我？让我有点不好意思呢😏', note: '打破尴尬' },
    { style: '真诚直球型', text: '有点忙，不过等我，我们晚上聊？', note: '表达真实' },
  ],
  next_steps: ['今晚准时回复', '避免过度解释', '下次对方主动示好时要回应'],
});

const callDeepSeek = async (prompt) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com';

  if (!apiKey) throw new APIError(ErrorCodes.LLM_FAILED, '未配置 DeepSeek API Key');

  const resp = await cloud.httpApi.request({
    url: `${apiUrl}/v1/chat/completions`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    data: {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    },
  });

  const body = JSON.parse(resp.data);
  const content = body?.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new APIError(ErrorCodes.LLM_FAILED, 'LLM 未返回有效 JSON');

  return JSON.parse(jsonMatch[0]);
};

exports.main = async (event = {}) => {
  try {
    const openid = ensureAuth();
    const { taskId, relationType, goalType } = event;

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
    if (!taskRes.data.ocr || !taskRes.data.ocr.messages) {
      throw new APIError(ErrorCodes.INVALID_PARAMS, '任务未完成 OCR');
    }

    const userRes = await db.collection('users').doc(openid).get().catch(() => null);
    if (!userRes || !userRes.data || userRes.data.credits < 1) {
      throw new APIError(ErrorCodes.INSUFFICIENT_CREDITS, '点数不足');
    }

    await db.collection('users').doc(openid).update({
      data: {
        credits: db.command.inc(-1),
        updatedAt: new Date(),
      },
    });

    const { messages } = taskRes.data.ocr;
    let llmResult;

    if (isMock()) {
      llmResult = mockLlmResult();
    } else {
      const prompt = buildPrompt(messages, relationType, goalType);
      llmResult = await callDeepSeek(prompt);
    }

    const now = new Date();
    await db.collection('analysis_tasks').doc(taskId).update({
      data: {
        llm: { result: llmResult },
        status: 'llm_done',
        updatedAt: now,
      },
    });

    await db.collection('wallet_ledger').add({
      data: {
        openid,
        type: 'analysis',
        delta: -1,
        balanceAfter: userRes.data.credits - 1,
        ref: { taskId },
        reason: 'LLM 分析扣费',
        createdAt: now,
      },
    });

    return ok(llmResult);
  } catch (error) {
    console.error('runLLM error:', error);

    if (error instanceof APIError) {
      return { code: error.code, message: error.message, details: error.details };
    }

    return { code: ErrorCodes.LLM_FAILED, message: 'LLM 处理失败', error: error.message };
  }
};

