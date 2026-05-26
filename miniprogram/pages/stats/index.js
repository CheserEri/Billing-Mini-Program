Page({
  data: {
    month: '',
    year: 0,
    monthNum: 0,
    totalExpense: '0.00',
    totalBudget: 5000,
    budgetPercent: 0,
    budgetRemain: '0.00',
    categoryStats: [],
    budgetList: [],
    loading: true,
    categoryColors: {
      '餐饮': '#EF9F27', '购物': '#D4537E', '水电': '#7F77DD',
      '交通': '#378ADD', '医疗': '#E24B4A', '住房': '#7F77DD',
      '娱乐': '#D4537E', '教育': '#378ADD', '通讯': '#378ADD', '其他': '#888780',
    },
  },

  onLoad() {
    const now = new Date();
    this.setData({
      year: now.getFullYear(),
      monthNum: now.getMonth() + 1,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    });
  },

  onShow() {
    this.loadStats();
  },

  onMonthChange(e) {
    const parts = e.detail.value.split('-');
    this.setData({
      month: e.detail.value,
      year: parseInt(parts[0]),
      monthNum: parseInt(parts[1]),
    });
    this.loadStats();
  },

  fmt(val) {
    return (Number(val) || 0).toFixed(2);
  },

  async loadStats() {
    const app = getApp();
    const ledgerId = app.globalData.currentLedgerId;
    if (!ledgerId) {
      this.setData({ loading: false });
      return;
    }

    this.setData({ loading: true });
    const { year, monthNum } = this.data;
    const colors = this.data.categoryColors;

    try {
      const summaryRes = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getMonthSummary',
          data: { ledgerId, year, month: monthNum },
        },
      });

      if (summaryRes.result && summaryRes.result.success) {
        const { totalExpense, categoryStats } = summaryRes.result.data;
        const coloredStats = categoryStats.map(item => ({
          ...item,
          amountText: this.fmt(item.amount),
          color: colors[item.name] || '#888780',
        }));

        const budgetRemain = Math.max(this.data.totalBudget - totalExpense, 0);
        const budgetPercent = Math.min(Math.round((totalExpense / this.data.totalBudget) * 100), 100);

        this.setData({
          totalExpense: this.fmt(totalExpense),
          categoryStats: coloredStats,
          budgetPercent,
          budgetRemain: this.fmt(budgetRemain),
        });
      }

      await this.loadBudgets(ledgerId, year, monthNum);
    } catch (err) {
      console.error('加载统计失败:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadBudgets(ledgerId, year, month) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getBudgetStatus',
          data: { ledgerId, year, month },
        },
      });

      if (res.result && res.result.success) {
        const budgetList = res.result.data.map(item => ({
          ...item,
          spentText: this.fmt(item.spent),
          percent: Math.min(Math.round((item.spent / item.amount) * 100), 100),
          overBudget: item.spent > item.amount,
          overAmount: item.spent > item.amount ? this.fmt(item.spent - item.amount) : '0.00',
          color: this.data.categoryColors[item.categoryName] || '#888780',
        }));
        this.setData({ budgetList });
      }
    } catch (err) {
      console.error('加载预算失败:', err);
    }
  },
});
