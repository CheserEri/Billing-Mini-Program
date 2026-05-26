Page({
  data: {
    ledgerList: [],
    currentLedgerId: '',
    showCreate: false,
    showJoin: false,
    newLedgerName: '',
    joinCode: '',
    loading: true,
    debugInfo: '',
  },

  onShow() {
    this.loadLedgers();
  },

  noop() {},

  async loadLedgers() {
    this.setData({ loading: true });
    const app = getApp();

    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getMyLedgers' },
      });

      console.log('[loadLedgers] 返回:', JSON.stringify(res.result));

      if (res.result && res.result.success) {
        this.setData({
          ledgerList: res.result.data || [],
          currentLedgerId: app.globalData.currentLedgerId,
          loading: false,
          debugInfo: '',
        });
      } else {
        const errMsg = (res.result && res.result.errMsg) || '未知错误';
        console.error('[loadLedgers] 失败:', errMsg);
        this.setData({ loading: false, debugInfo: '加载失败: ' + errMsg });
      }
    } catch (err) {
      console.error('[loadLedgers] 异常:', JSON.stringify(err));
      this.setData({ loading: false });
      this.handleCloudError(err, '加载账本');
    }
  },

  // 切换账本
  switchLedger(e) {
    const id = e.currentTarget.dataset.id;
    const app = getApp();
    app.globalData.currentLedgerId = id;
    this.setData({ currentLedgerId: id });
    wx.showToast({ title: '已切换', icon: 'success' });
  },

  // 显示创建弹窗
  showCreateModal() {
    this.setData({ showCreate: true, newLedgerName: '' });
  },

  hideCreateModal() {
    this.setData({ showCreate: false });
  },

  onLedgerNameInput(e) {
    this.setData({ newLedgerName: e.detail.value });
  },

  async createLedger() {
    const { newLedgerName } = this.data;
    if (!newLedgerName || !newLedgerName.trim()) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '创建中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'createLedger',
          data: { name: newLedgerName.trim() },
        },
      });

      console.log('[createLedger] 返回:', JSON.stringify(res.result));

      if (res.result && res.result.success) {
        const app = getApp();
        if (res.result._id) {
          app.globalData.currentLedgerId = res.result._id;
        }
        wx.showToast({ title: '创建成功', icon: 'success' });
        this.setData({ showCreate: false, newLedgerName: '' });
        await this.loadLedgers();
      } else {
        const errMsg = (res.result && res.result.errMsg) || '创建失败';
        console.error('[createLedger] 失败:', errMsg);
        wx.showToast({ title: errMsg, icon: 'none', duration: 3000 });
      }
    } catch (err) {
      console.error('[createLedger] 异常:', JSON.stringify(err));
      wx.hideLoading();
      this.handleCloudError(err, '创建账本');
    } finally {
      wx.hideLoading();
    }
  },

  // 显示加入弹窗
  showJoinModal() {
    this.setData({ showJoin: true, joinCode: '' });
  },

  hideJoinModal() {
    this.setData({ showJoin: false });
  },

  onJoinCodeInput(e) {
    this.setData({ joinCode: e.detail.value.toUpperCase() });
  },

  async joinLedger() {
    const { joinCode } = this.data;
    if (!joinCode || !joinCode.trim()) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加入中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'joinLedger',
          data: { inviteCode: joinCode.trim() },
        },
      });

      console.log('[joinLedger] 返回:', JSON.stringify(res.result));

      if (res.result && res.result.success) {
        const app = getApp();
        if (res.result.ledgerId) {
          app.globalData.currentLedgerId = res.result.ledgerId;
        }
        wx.showToast({ title: '加入成功', icon: 'success' });
        this.setData({ showJoin: false, joinCode: '' });
        await this.loadLedgers();
      } else {
        const errMsg = (res.result && res.result.errMsg) || '加入失败';
        console.error('[joinLedger] 失败:', errMsg);
        wx.showToast({ title: errMsg, icon: 'none', duration: 3000 });
      }
    } catch (err) {
      console.error('[joinLedger] 异常:', JSON.stringify(err));
      wx.hideLoading();
      this.handleCloudError(err, '加入账本');
    } finally {
      wx.hideLoading();
    }
  },

  // 复制邀请码
  copyInviteCode(e) {
    const code = e.currentTarget.dataset.code;
    wx.setClipboardData({
      data: code,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      },
    });
  },

  // 统一处理云函数错误
  handleCloudError(err, action) {
    const errMsg = err.errMsg || err.message || JSON.stringify(err);

    if (errMsg.includes('collection not exists') || errMsg.includes('not exist')) {
      wx.showModal({
        title: '数据库集合未创建',
        content: '请在云开发控制台 → 数据库中创建以下集合：\n\n1. ledgers\n2. transactions\n3. budgets\n\n创建后重新编译运行。',
        showCancel: false,
      });
    } else if (errMsg.includes('FunctionName') || errMsg.includes('not found') || errMsg.includes('不存在')) {
      wx.showModal({
        title: '云函数未部署',
        content: '请在微信开发者工具中：\n\n右键 cloudfunctions/quickstartFunctions → 上传并部署（云端安装依赖）\n\n部署完成后重新编译。',
        showCancel: false,
      });
    } else {
      wx.showModal({
        title: action + '失败',
        content: errMsg,
        showCancel: false,
      });
    }
  },
});
