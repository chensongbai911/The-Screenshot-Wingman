// 全局入口，初始化云开发并预取用户信息
App({
  globalData: {
    user: null,
  },

  onLaunch () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }

    wx.cloud.init({
      env: process.env.CLOUDBASE_ENV_ID || 'cloud1',
      traceUser: true,
    });

    // 预先确保用户初始化
    wx.cloud.callFunction({
      name: 'authEnsureUser',
    }).then((res) => {
      this.globalData.user = res.result?.data || null;
    }).catch((err) => {
      console.error('authEnsureUser failed', err);
    });
  },
});
