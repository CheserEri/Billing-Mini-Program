App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }

    // ========================================
    // 请填入你的云开发环境 ID
    // 获取方式：微信开发者工具 → 云开发 → 设置 → 环境ID
    // 示例：'cloud1-xxxxxxx'
    // ========================================
    const CLOUD_ENV = 'cloudbase-d2glcy3bedaa596ef';

    if (!CLOUD_ENV) {
      console.error('请在 app.js 中填入云开发环境 ID (CLOUD_ENV)');
      wx.showModal({
        title: '配置提示',
        content: '请在 app.js 中填入云开发环境 ID。开通方式：微信开发者工具 → 云开发 → 设置 → 复制环境 ID',
        showCancel: false,
      });
      return;
    }

    wx.cloud.init({
      env: CLOUD_ENV,
      traceUser: true,
    });

    this.globalData = {
      openid: '',
      userInfo: null,
      currentLedgerId: '',
      ledgerList: [],
    };

    this.initApp();
  },

  async initApp() {
    try {
      await this.getOpenid();
      await this.initLedger();
    } catch (err) {
      console.error('初始化失败:', err);
    }
  },

  async getOpenid() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getOpenId' },
      });
      if (res.result && res.result.openid) {
        this.globalData.openid = res.result.openid;
      }
    } catch (err) {
      console.error('获取 openid 失败:', err);
    }
  },

  async initLedger() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getMyLedgers' },
      });

      if (res.result && res.result.success && res.result.data.length > 0) {
        this.globalData.ledgerList = res.result.data;
        this.globalData.currentLedgerId = res.result.data[0]._id;
      } else {
        // 没有账本，创建默认账本
        const createRes = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'createLedger',
            data: { name: '默认账本' },
          },
        });
        if (createRes.result && createRes.result.success) {
          this.globalData.currentLedgerId = createRes.result._id;
          const retry = await wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: { type: 'getMyLedgers' },
          });
          if (retry.result && retry.result.success) {
            this.globalData.ledgerList = retry.result.data;
          }
        } else {
          const msg = (createRes.result && createRes.result.errMsg) || '未知错误';
          console.error('创建默认账本失败:', msg);
          wx.showModal({ title: '创建默认账本失败', content: msg, showCancel: false });
        }
      }
    } catch (err) {
      console.error('初始化账本失败:', err);
      const errMsg = err.errMsg || err.message || JSON.stringify(err);
      if (errMsg.includes('collection not exists') || errMsg.includes('not exist')) {
        wx.showModal({
          title: '数据库集合未创建',
          content: '请在云开发控制台 → 数据库中依次创建：\n\n1. ledgers\n2. transactions\n3. budgets\n\n然后重新编译运行。',
          showCancel: false,
        });
      } else if (errMsg.includes('FunctionName') || errMsg.includes('not found')) {
        wx.showModal({
          title: '云函数未部署',
          content: '请右键 cloudfunctions/quickstartFunctions → 上传并部署（云端安装依赖）',
          showCancel: false,
        });
      } else {
        wx.showModal({ title: '初始化失败', content: errMsg, showCancel: false });
      }
    }
  },
});
