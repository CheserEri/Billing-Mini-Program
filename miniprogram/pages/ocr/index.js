Page({
  data: {
    hasImage: false,
    imagePath: '',
    recognizing: false,
    recognized: false,
    ocrResult: null,
    categories: [
      { id: 1, name: '餐饮' },
      { id: 2, name: '购物' },
      { id: 3, name: '交通' },
      { id: 4, name: '水电' },
      { id: 5, name: '医疗' },
      { id: 6, name: '娱乐' },
      { id: 7, name: '其他' },
    ],
    selectedCategoryId: 1,
    members: [],
    selectedMember: '',
    saving: false,
  },

  onShow() {
    this.loadMembers();
  },

  loadMembers() {
    const app = getApp();
    const ledgerList = app.globalData.ledgerList || [];
    const currentId = app.globalData.currentLedgerId;
    const current = ledgerList.find(l => l._id === currentId);

    if (current && current.members) {
      const members = current.members.map(m => ({
        openid: typeof m === 'string' ? m : m.openid,
        name: typeof m === 'string' ? '成员' : m.name,
      }));
      this.setData({
        members,
        selectedMember: members.length > 0 ? members[0].openid : '',
      });
    }
  },

  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath;
        this.setData({
          hasImage: true,
          imagePath: path,
          recognized: false,
          ocrResult: null,
        });
        this.doOcr(path);
      },
    });
  },

  async doOcr(imagePath) {
    this.setData({ recognizing: true });

    try {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `receipts/${Date.now()}.jpg`,
        filePath: imagePath,
      });

      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'ocrReceipt',
          data: { fileID: uploadRes.fileID },
        },
      });

      if (res.result && res.result.success) {
        const ocrResult = res.result.data;
        ocrResult.amountText = (Number(ocrResult.amount) || 0).toFixed(2);
        this.setData({
          recognized: true,
          recognizing: false,
          ocrResult,
          selectedCategoryId: ocrResult.categoryId || 1,
        });
      } else {
        wx.showToast({ title: '识别失败', icon: 'none' });
        this.setData({ recognizing: false });
      }
    } catch (err) {
      console.error('OCR 失败:', err);
      wx.showToast({ title: '识别失败', icon: 'none' });
      this.setData({ recognizing: false });
    }
  },

  selectCategory(e) {
    this.setData({ selectedCategoryId: e.currentTarget.dataset.id });
  },

  selectMember(e) {
    this.setData({ selectedMember: e.currentTarget.dataset.id });
  },

  getCategoryIcon(id) {
    const map = { 1: '🍜', 2: '🛒', 3: '🚗', 4: '⚡', 5: '💊', 6: '🎮', 7: '📌' };
    return map[id] || '📌';
  },

  async confirmSave() {
    const { ocrResult, selectedCategoryId, selectedMember, categories, members, saving } = this.data;
    if (saving || !ocrResult) return;

    const app = getApp();
    const ledgerId = app.globalData.currentLedgerId;
    const category = categories.find(c => c.id === selectedCategoryId);
    const member = members.find(m => m.openid === selectedMember);

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'addTransaction',
          data: {
            ledgerId,
            type: 'expense',
            amount: ocrResult.amount,
            categoryId: selectedCategoryId,
            categoryName: category.name,
            categoryIcon: this.getCategoryIcon(selectedCategoryId),
            note: ocrResult.merchant,
            date: ocrResult.date,
            method: 'ocr',
            creatorName: member ? member.name : '我',
            assignTo: selectedMember,
          },
        },
      });

      if (res.result && res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        this.resetPage();
      } else {
        wx.showToast({ title: (res.result && res.result.errMsg) || '保存失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  },

  retake() {
    this.resetPage();
  },

  resetPage() {
    this.setData({
      hasImage: false,
      imagePath: '',
      recognizing: false,
      recognized: false,
      ocrResult: null,
    });
  },

  goToManual() {
    wx.navigateTo({ url: '/pages/record/index' });
  },
});
