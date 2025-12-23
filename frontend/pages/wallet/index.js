const app = getApp();

Page({
  data: {
    credits: 0,
    products: [
      { id: 'product_5', credits: 5, price: 2.99, note: '尝鲜装' },
      { id: 'product_20', credits: 20, price: 9.9, note: '超值装' },
    ],
    ledger: [],
  },

  onLoad () {
    this.loadUserCredits();
    this.loadLedger();
  },

  onShow () {
    this.loadUserCredits();
  },

  async loadUserCredits () {
    try {
      const user = app.globalData.user;
      if (user) {
        this.setData({ credits: user.credits || 0 });
      } else {
        const res = await wx.cloud.callFunction({ name: 'authEnsureUser' });
        const credits = res.result?.data?.credits || 0;
        this.setData({ credits });
        if (app.globalData) app.globalData.user = res.result?.data;
      }
    } catch (err) {
      console.error('loadUserCredits error', err);
    }
  },

  async loadLedger () {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('wallet_ledger')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const ledger = (res.data || []).map((item) => ({
        ...item,
        typeLabel: this.getLedgerTypeLabel(item.type),
        timeLabel: this.formatTime(item.createdAt),
      }));

      this.setData({ ledger });
    } catch (err) {
      console.error('loadLedger error', err);
    }
  },

  getLedgerTypeLabel (type) {
    const map = {
      new_user_bonus: '新手赠送',
      analysis: '分析扣费',
      deep_report: '深度报告',
      refresh_replies: '换一批回复',
      purchase: '充值',
      refund: '退款',
    };
    return map[type] || type;
  },

  formatTime (date) {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  },

  buyProduct (e) {
    const productId = e.currentTarget.dataset.id;
    const product = this.data.products.find((p) => p.id === productId);
    if (!product) return;

    wx.showModal({
      title: '购买点数',
      content: `确认购买 ${product.credits} 点，支付 ¥${product.price}？`,
      success: (res) => {
        if (res.confirm) {
          this.createOrder(product);
        }
      },
    });
  },

  async createOrder (product) {
    try {
      wx.showLoading({ title: '处理中...', mask: true });

      const res = await wx.cloud.callFunction({
        name: 'createOrder',
        data: { productId: product.id },
      });

      wx.hideLoading();

      if (res.result?.code !== 0) {
        throw new Error(res.result?.message || '创建订单失败');
      }

      const { orderId, paymentParams } = res.result.data;

      // TODO: 真实支付需调用 wx.requestPayment(paymentParams)
      // 目前模拟支付成功，直接调用 payOrder
      this.mockPaymentSuccess(orderId);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '创建订单失败', icon: 'none' });
    }
  },

  async mockPaymentSuccess (orderId) {
    try {
      wx.showLoading({ title: '支付处理中...', mask: true });

      const res = await wx.cloud.callFunction({
        name: 'payOrder',
        data: { orderId },
      });

      wx.hideLoading();

      if (res.result?.code === 0) {
        wx.showToast({ title: '充值成功', icon: 'success' });
        setTimeout(() => {
          this.loadUserCredits();
          this.loadLedger();
        }, 1500);
      } else {
        throw new Error(res.result?.message || '支付失败');
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '支付处理失败', icon: 'none' });
    }
  },
});
