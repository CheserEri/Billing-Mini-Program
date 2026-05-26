Page({
  data: {
    type: 'expense', // expense | income
    amount: '',
    categories: [],
    selectedCategory: null,
    note: '',
    date: '',
    submitting: false,
    expenseCategories: [
      { id: 1, name: '餐饮', icon: '🍜' },
      { id: 2, name: '交通', icon: '🚗' },
      { id: 3, name: '购物', icon: '🛒' },
      { id: 4, name: '住房', icon: '🏠' },
      { id: 5, name: '娱乐', icon: '🎮' },
      { id: 6, name: '医疗', icon: '💊' },
      { id: 7, name: '教育', icon: '📚' },
      { id: 8, name: '通讯', icon: '📱' },
      { id: 9, name: '其他', icon: '📌' },
    ],
    incomeCategories: [
      { id: 10, name: '工资', icon: '💰' },
      { id: 11, name: '奖金', icon: '🎁' },
      { id: 12, name: '投资', icon: '📈' },
      { id: 13, name: '兼职', icon: '💼' },
      { id: 14, name: '其他', icon: '📌' },
    ],
  },

  onLoad() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.setData({
      date: dateStr,
      categories: this.data.expenseCategories,
    });
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      type,
      categories: type === 'expense' ? this.data.expenseCategories : this.data.incomeCategories,
      selectedCategory: null,
    });
  },

  selectCategory(e) {
    const id = e.currentTarget.dataset.id;
    const category = this.data.categories.find(c => c.id === id);
    this.setData({ selectedCategory: category });
  },

  onAmountInput(e) {
    let value = e.detail.value;
    if (value.indexOf('.') >= 0 && value.split('.')[1].length > 2) {
      value = value.substring(0, value.indexOf('.') + 3);
    }
    this.setData({ amount: value });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value });
  },

  async submitRecord() {
    const { amount, selectedCategory, type, note, date, submitting } = this.data;

    if (submitting) return;

    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' });
      return;
    }
    if (!selectedCategory) {
      wx.showToast({ title: '请选择分类', icon: 'none' });
      return;
    }

    const app = getApp();
    const ledgerId = app.globalData.currentLedgerId;
    if (!ledgerId) {
      wx.showToast({ title: '请先创建账本', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'addTransaction',
          data: {
            ledgerId,
            type,
            amount: parseFloat(amount),
            categoryId: selectedCategory.id,
            categoryName: selectedCategory.name,
            categoryIcon: selectedCategory.icon,
            note,
            date,
          },
        },
      });

      if (res.result.success) {
        wx.showToast({ title: '记录成功', icon: 'success' });
        this.setData({
          amount: '',
          selectedCategory: null,
          note: '',
        });
      } else {
        wx.showToast({ title: res.result.errMsg || '保存失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
      console.error('保存记录失败:', err);
    } finally {
      wx.hideLoading();
      this.setData({ submitting: false });
    }
  },
});
