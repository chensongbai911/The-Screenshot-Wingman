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

const generateOrderNo = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${timestamp}${random}`;
};

const PRODUCTS = {
  product_5: { credits: 5, amountFen: 299 },
  product_20: { credits: 20, amountFen: 990 },
};

exports.main = async (event = {}) => {
  try {
    const openid = ensureAuth();
    const { productId } = event;

    if (!productId || !PRODUCTS[productId]) {
      throw new APIError(ErrorCodes.INVALID_PARAMS, '无效的商品 ID');
    }

    const product = PRODUCTS[productId];
    const orderNo = generateOrderNo();
    const now = new Date();

    // 创建订单
    const orderRes = await db.collection('orders').add({
      data: {
        orderNo,
        openid,
        productId,
        amountFen: product.amountFen,
        creditsAdded: 0,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      },
    });

    const orderId = orderRes._id;

    // TODO: 调用微信支付统一下单接口，获取 payment 参数
    // 目前返回占位数据，前端需调用 wx.requestPayment 完成支付
    const paymentParams = {
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: Math.random().toString(36).substr(2, 15),
      package: `prepay_id=mock_prepay_${orderId}`,
      signType: 'RSA',
      paySign: 'mock_sign',
    };

    return ok({
      orderId,
      orderNo,
      amountFen: product.amountFen,
      credits: product.credits,
      paymentParams, // 前端用于 wx.requestPayment
    });
  } catch (error) {
    console.error('createOrder error:', error);

    if (error instanceof APIError) {
      return { code: error.code, message: error.message, details: error.details };
    }

    return { code: ErrorCodes.DATABASE_ERROR, message: '创建订单失败', error: error.message };
  }
};
