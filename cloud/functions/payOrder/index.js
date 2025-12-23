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
    const { orderId } = event;

    if (!orderId) {
      throw new APIError(ErrorCodes.INVALID_PARAMS, 'orderId 必填');
    }

    const orderRes = await db.collection('orders').doc(orderId).get().catch(() => null);
    if (!orderRes || !orderRes.data) {
      throw new APIError(ErrorCodes.NOT_FOUND, '订单不存在');
    }
    if (orderRes.data.openid !== openid) {
      throw new APIError(ErrorCodes.UNAUTHORIZED, '无权操作此订单');
    }

    const order = orderRes.data;

    // 防重：已支付订单不重复处理
    if (order.status === 'paid') {
      return ok({ message: '订单已支付', credits: order.creditsAdded });
    }

    // TODO: 真实场景需调用微信支付查询接口验证支付结果
    // 这里简化为直接标记为已支付（仅用于开发测试）
    const productMap = {
      product_5: 5,
      product_20: 20,
    };
    const credits = productMap[order.productId] || 0;

    const now = new Date();

    // 原子操作：更新用户积分
    await db.collection('users').doc(openid).update({
      data: {
        credits: db.command.inc(credits),
        updatedAt: now,
      },
    });

    // 更新订单状态
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'paid',
        creditsAdded: credits,
        paidAt: now,
        updatedAt: now,
      },
    });

    // 记录账本
    await db.collection('wallet_ledger').add({
      data: {
        openid,
        type: 'purchase',
        delta: credits,
        balanceAfter: 0, // 可查询用户当前 credits 填入
        ref: { orderId },
        reason: `充值 ${credits} 点`,
        createdAt: now,
      },
    });

    return ok({ message: '支付成功', credits });
  } catch (error) {
    console.error('payOrder error:', error);

    if (error instanceof APIError) {
      return { code: error.code, message: error.message, details: error.details };
    }

    return { code: ErrorCodes.DATABASE_ERROR, message: '支付处理失败', error: error.message };
  }
};
