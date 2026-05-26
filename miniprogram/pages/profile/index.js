Page({
  data: {
    userInfo: null,
    menuList: [
      { id: 'ledger', name: '账本管理', icon: '📒' },
      { id: 'export', name: '数据导出', icon: '📤' },
      { id: 'category', name: '分类管理', icon: '🏷️' },
      { id: 'about', name: '关于', icon: 'ℹ️' },
    ],
  },

  onLoad() {
    const app = getApp();
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo });
    }
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于展示用户信息',
      success: (res) => {
        this.setData({ userInfo: res.userInfo });
        getApp().globalData.userInfo = res.userInfo;
      },
    });
  },

  onMenuTap(e) {
    const id = e.currentTarget.dataset.id;
    switch (id) {
      case 'ledger':
        wx.navigateTo({ url: '/pages/ledger/index' });
        break;
      default:
        wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  },
});
