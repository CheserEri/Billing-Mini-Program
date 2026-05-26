Page({
  data: {
    ledgerName: '',
    members: [],
    ledgerList: [],
    currentLedgerId: '',
    totalExpense: '0.00',
    loading: true,
    avatarColors: [
      { bg: '#EEEDFE', color: '#534AB7' },
      { bg: '#E1F5EE', color: '#0F6E56' },
      { bg: '#FBEAF0', color: '#993556' },
      { bg: '#FAEEDA', color: '#854F0B' },
    ],
  },

  onShow() {
    this.loadData();
  },

  fmt(val) {
    return (Number(val) || 0).toFixed(2);
  },

  async loadData() {
    const app = getApp();
    this.setData({ loading: true });

    try {
      const ledgerRes = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getMyLedgers' },
      });

      if (ledgerRes.result && ledgerRes.result.success) {
        app.globalData.ledgerList = ledgerRes.result.data;
        const currentId = app.globalData.currentLedgerId;
        const current = ledgerRes.result.data.find(l => l._id === currentId);

        this.setData({
          ledgerList: ledgerRes.result.data,
          currentLedgerId: currentId,
          ledgerName: current ? current.name : '未知账本',
        });

        if (currentId) {
          await this.loadMemberStats(currentId);
        }
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadMemberStats(ledgerId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getMemberStats',
          data: { ledgerId, year, month },
        },
      });

      if (res.result && res.result.success) {
        const { members, totalExpense } = res.result.data;
        const colors = this.data.avatarColors;

        const enrichedMembers = members.map((m, i) => ({
          ...m,
          spentText: this.fmt(m.spent),
          avatarBg: colors[i % colors.length].bg,
          avatarColor: colors[i % colors.length].color,
          avatarText: (m.name || '?').substring(0, 1),
          percent: totalExpense > 0 ? Math.round((m.spent / totalExpense) * 100) : 0,
          roleText: m.role === 'admin' ? '管理员' : m.role === 'readonly' ? '只读' : '成员',
          roleBg: m.role === 'admin' ? '#EEEDFE' : m.role === 'readonly' ? '#F1EFE8' : '#E1F5EE',
          roleColor: m.role === 'admin' ? '#534AB7' : m.role === 'readonly' ? '#5F5E5A' : '#0F6E56',
          barColor: colors[i % colors.length].color,
        }));

        this.setData({
          members: enrichedMembers,
          totalExpense: this.fmt(totalExpense),
        });
      }
    } catch (err) {
      console.error('加载成员统计失败:', err);
    }
  },

  switchLedger(e) {
    const id = e.currentTarget.dataset.id;
    const app = getApp();
    app.globalData.currentLedgerId = id;

    const ledger = this.data.ledgerList.find(l => l._id === id);
    this.setData({
      currentLedgerId: id,
      ledgerName: ledger ? ledger.name : '',
    });

    this.loadMemberStats(id);
    wx.showToast({ title: '已切换', icon: 'success' });
  },

  createLedger() {
    wx.navigateTo({ url: '/pages/ledger/index' });
  },
});
