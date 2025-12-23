Page({
  data: {
    taskId: '',
    result: {},
  },

  async onLoad (options) {
    const { taskId } = options;
    if (!taskId) {
      wx.showToast({ title: '缺少任务 ID', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ taskId });

    try {
      const res = await wx.cloud.database().collection('analysis_tasks').doc(taskId).get();
      const task = res?.data;
      if (!task) throw new Error('任务不存在');

      if (task.llm && task.llm.result) {
        this.setData({ result: task.llm.result });
      } else if (task.status === 'ocr_done') {
        await this.runLlm();
      } else {
        wx.showToast({ title: '任务未完成', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      console.error('load task error', err);
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  async runLlm () {
    try {
      wx.showLoading({ title: '分析中...', mask: true });
      const res = await wx.cloud.callFunction({
        name: 'runLLM',
        data: { taskId: this.data.taskId },
      });
      wx.hideLoading();

      if (res.result?.code === 0) {
        this.setData({ result: res.result.data });
      } else {
        throw new Error(res.result?.message || 'LLM 失败');
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || 'LLM 处理失败', icon: 'none' });
    }
  },

  copyReply (e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({ data: text, success: () => wx.showToast({ title: '已复制', icon: 'success' }) });
  },
});
