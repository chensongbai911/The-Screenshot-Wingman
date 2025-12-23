Page({
  data: {
    taskId: '',
    status: 'analyzing',
    statusText: '正在分析...',
    hint: '军师正在识别聊天内容',
    pollTimer: null,
  },

  onLoad (options) {
    const { taskId } = options;
    if (!taskId) {
      wx.showToast({ title: '缺少任务 ID', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ taskId });
    this.startPolling();
  },

  onUnload () {
    if (this.data.pollTimer) clearInterval(this.data.pollTimer);
  },

  async startPolling () {
    const poll = async () => {
      try {
        const res = await wx.cloud.database().collection('analysis_tasks').doc(this.data.taskId).get();
        const task = res?.data;
        if (!task) {
          wx.showToast({ title: '任务不存在', icon: 'none' });
          wx.navigateBack();
          return;
        }

        if (task.status === 'ocr_done' || task.status === 'llm_done') {
          clearInterval(this.data.pollTimer);
          this.setData({ status: 'done', statusText: '分析完成', hint: '即将跳转结果页' });
          setTimeout(() => {
            wx.redirectTo({ url: `/pages/result/index?taskId=${this.data.taskId}` });
          }, 800);
        } else if (task.status === 'error') {
          clearInterval(this.data.pollTimer);
          wx.showToast({ title: '分析失败', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 1500);
        }
      } catch (err) {
        console.error('poll error', err);
      }
    };

    await poll();
    const timer = setInterval(poll, 2000);
    this.setData({ pollTimer: timer });
  },
});
