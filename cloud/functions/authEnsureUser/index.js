const cloud = require('wx-server-sdk');
const { APIError, ErrorCodes } = require('../../shared/error');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID) {
      throw new APIError(ErrorCodes.UNAUTHORIZED, '未授权的请求');
    }

    const userDoc = await db.collection('users').doc(OPENID).get().catch(() => null);
    let user;

    if (userDoc && userDoc.data) {
      user = userDoc.data;
      await db.collection('users').doc(OPENID).update({
        lastActiveAt: new Date(),
      });
    } else {
      await db.collection('users').doc(OPENID).set({
        _id: OPENID,
        credits: 1,
        freeCreditsGranted: true,
        settings: {
          historyEnabled: true,
          privacyAccepted: false,
        },
        createdAt: new Date(),
        lastActiveAt: new Date(),
      });

      await db.collection('wallet_ledger').add({
        openid: OPENID,
        type: 'new_user_bonus',
        delta: 1,
        balanceAfter: 1,
        reason: '新用户赠送',
        createdAt: new Date(),
      });

      user = {
        _id: OPENID,
        credits: 1,
        freeCreditsGranted: true,
        settings: {
          historyEnabled: true,
          privacyAccepted: false,
        },
      };
    }

    return {
      code: 0,
      message: 'success',
      data: {
        openid: OPENID,
        credits: user.credits,
        settings: user.settings,
      },
    };
  } catch (error) {
    console.error('authEnsureUser error:', error);

    if (error instanceof APIError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
      };
    }

    return {
      code: ErrorCodes.DATABASE_ERROR,
      message: '服务器错误',
      error: error.message,
    };
  }
};
