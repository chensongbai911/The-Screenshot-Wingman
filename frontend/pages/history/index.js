Page({
  data: {
    tasks: [],
  },

  onLoad () {
    this.loadTasks();
  },

  async loadTasks () {
    try {
      wx.showLoading({ title: '加载中...', mask: true });
      const db = wx.cloud.database();
      const res = await db.collection('analysis_tasks')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const tasks = (res.data || []).map((task) => ({
        ...task,
        timeLabel: this.formatTime(task.createdAt),
        statusLabel: this.getStatusLabel(task.status),
        statusClass: this.getStatusClass(task.status),
        preview: this.getPreview(task),
        relationLabel: this.getRelationLabel(task.relationType),
        goalLabel: this.getGoalLabel(task.goalType),
      }));

      this.setData({ tasks });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('loadTasks error', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  formatTime (date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  getStatusLabel (status) {
    const map = {
      created: '已创建',
      uploaded: '已上传',
      ocr_done: 'OCR完成',
      llm_done: '分析完成',
      error: '失败',
    };
    return map[status] || status;
  },

  getStatusClass (status) {
    if (status === 'llm_done') return 'success';
    if (status === 'error') return 'error';
    return 'processing';
  },

  getPreview (task) {
    if (task.llm?.result?.profile_one_liner) {
      return task.llm.result.profile_one_liner;
    }
    if (task.ocr?.messages?.length > 0) {
      const first = task.ocr.messages[0];
      return `${first.role === 'me' ? '我' : '对方'}: ${first.text.substring(0, 30)}...`;
    }
    return '暂无预览';
  },

  getRelationLabel (type) {
    const map = {
      partner: '情侣',
      crush: '暧昧',
      friend: '朋友',
      colleague: '同事',
    };
    return map[type] || type;
  },

  getGoalLabel (type) {
    const map = {
      reply: '写回复',
      tone: '看态度',
      insight: '要建议',
    };
    return map[type] || type;
  },

  viewTask (e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/result/index?taskId=${taskId}` });
  },
});
