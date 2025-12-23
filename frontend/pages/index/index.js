Page({
  data: {
    imagePath: '',
    relation: 'partner',
    goal: 'reply',
    privacyAccepted: false,
    relationOptions: [
      { key: 'partner', label: '情侣' },
      { key: 'crush', label: '暧昧' },
      { key: 'friend', label: '朋友' },
      { key: 'colleague', label: '同事' },
    ],
    goalOptions: [
      { key: 'reply', label: '写回复' },
      { key: 'tone', label: '看态度' },
      { key: 'insight', label: '要建议' },
    ],
  },

  onLoad () {
    this.updateStartState();
  },

  chooseImage () {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const file = res.tempFiles?.[0];
        if (file) {
          this.setData({ imagePath: file.tempFilePath }, this.updateStartState);
        }
      },
      fail: (err) => {
        console.error('chooseImage failed', err);
      },
    });
  },

  selectRelation (e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ relation: key }, this.updateStartState);
  },

  selectGoal (e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ goal: key }, this.updateStartState);
  },

  togglePrivacy (e) {
    this.setData({ privacyAccepted: e.detail.value.length > 0 }, this.updateStartState);
  },

  updateStartState () {
    const { imagePath, privacyAccepted } = this.data;
    this.setData({ canStart: !!imagePath && !!privacyAccepted });
  },

  async startAnalysis () {
    if (!this.data.canStart) {
      wx.showToast({ title: '请上传截图并同意隐私', icon: 'none' });
      return;
    }

    const { imagePath, relation, goal } = this.data;

    try {
      wx.showLoading({ title: '处理中...', mask: true });

      const taskRes = await wx.cloud.callFunction({
        name: 'createTask',
        data: { relationType: relation, goalType: goal },
      });
      const taskId = taskRes.result?.data?.taskId;
      if (!taskId) throw new Error('任务创建失败');

      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `temp/${taskId}_${Date.now()}.jpg`,
        filePath: imagePath,
      });
      const fileId = uploadRes.fileID;
      if (!fileId) throw new Error('上传失败');

      await wx.cloud.callFunction({
        name: 'bindUpload',
        data: { taskId, fileId },
      });

      await wx.cloud.callFunction({
        name: 'runOCR',
        data: { taskId },
      });

      wx.hideLoading();
      wx.navigateTo({ url: `/pages/analyzing/analyzing?taskId=${taskId}` });
    } catch (err) {
      console.error('startAnalysis failed', err);
      wx.hideLoading();
      wx.showToast({ title: err.message || '处理失败', icon: 'none' });
    }
  },
});
