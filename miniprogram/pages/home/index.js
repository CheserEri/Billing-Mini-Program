Page({
  data: {
    ledgerName: '家庭账本',
    memberCount: 0,
    month: '',
    year: 0,
    monthNum: 0,
    totalIncome: '0.00',
    totalExpense: '0.00',
    balance: '0.00',
    recentRecords: [],
    loading: true,
    dbStatus: '',
  },

  onLoad() {
    const now = new Date();
    this.setData({
      year: now.getFullYear(),
      monthNum: now.getMonth() + 1,
      month: `${now.getFullYear()}年${now.getMonth() + 1}月`,
    });
    this.checkDbConnection();
  },

  onShow() {
    this.loadLedgerInfo();
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  checkDbConnection() {
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: { type: 'getOpenId' },
    }).then(res => {
      console.log('[诊断] 云函数正常, openid:', res.result.openid);
      const db = wx.cloud.database();
      return db.collection('ledgers').limit(1).get();
    }).then(() => {
      this.setData({ dbStatus: '✅ 数据库已连接' });
      setTimeout(() => this.setData({ dbStatus: '' }), 3000);
    }).catch(err => {
      console.error('[诊断]', err);
      this.setData({ dbStatus: '❌ 连接异常' });
    });
  },

  loadLedgerInfo() {
    const app = getApp();
    const ledgerList = app.globalData.ledgerList || [];
    const currentId = app.globalData.currentLedgerId;
    const current = ledgerList.find(l => l._id === currentId);
    if (current) {
      this.setData({
        ledgerName: current.name,
        memberCount: current.members ? current.members.length : 1,
      });
    }
  },

  async loadData() {
    const app = getApp();
    const ledgerId = app.globalData.currentLedgerId;

    if (!ledgerId) {
      this.setData({ loading: false });
      return;
    }

    this.setData({ loading: true });

    try {
      await Promise.all([
        this.loadMonthSummary(ledgerId),
        this.loadRecentRecords(ledgerId),
      ]);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  fmt(val) {
    const n = Number(val) || 0;
    return n.toFixed(2);
  },

  async loadMonthSummary(ledgerId) {
    const { year, monthNum } = this.data;
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getMonthSummary',
          data: { ledgerId, year, month: monthNum },
        },
      });
      if (res.result && res.result.success) {
        const { totalIncome, totalExpense, balance } = res.result.data;
        this.setData({
          totalIncome: this.fmt(totalIncome),
          totalExpense: this.fmt(totalExpense),
          balance: this.fmt(balance),
        });
      }
    } catch (err) {
      console.error('加载月度汇总失败:', err);
    }
  },

  async loadRecentRecords(ledgerId) {
    const { year, monthNum } = this.data;
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getTransactions',
          data: { ledgerId, year, month: monthNum, page: 0, pageSize: 10 },
        },
      });
      if (res.result && res.result.success) {
        const records = res.result.data.map(item => ({
          ...item,
          amountText: this.fmt(item.amount),
          badgeClass: this.getBadgeClass(item.categoryId),
          timeText: this.formatTime(item.date, item.createTime),
          methodText: item.method === 'ocr' ? '照片识别' : '手动录入',
        }));
        this.setData({ recentRecords: records });
      }
    } catch (err) {
      console.error('加载最近记录失败:', err);
    }
  },

  getBadgeClass(categoryId) {
    const map = {
      1: 'food', 2: 'trans', 3: 'shop', 4: 'util',
      5: 'shop', 6: 'util', 7: 'trans', 8: 'trans', 9: '',
    };
    return map[categoryId] || '';
  },

  formatTime(dateStr, createTime) {
    if (!dateStr) return '';
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const y = new Date(now.getTime() - 86400000);
    const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;

    let dayText = dateStr;
    if (dateStr === today) dayText = '今天';
    else if (dateStr === yesterdayStr) dayText = '昨天';
    else {
      const parts = dateStr.split('-');
      dayText = `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    }

    if (createTime) {
      const d = new Date(createTime);
      return `${dayText} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return dayText;
  },

  goToOcr() {
    wx.switchTab({ url: '/pages/ocr/index' });
  },

  goToRecord() {
    wx.navigateTo({ url: '/pages/record/index' });
  },
});
