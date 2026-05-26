const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// ============ 基础 ============

const getOpenId = async () => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// ============ 交易记录 ============

const addTransaction = async (event) => {
  const wxContext = cloud.getWXContext();
  const { ledgerId, type, amount, categoryId, categoryName, categoryIcon, note, date, method, creatorName, assignTo } = event.data;

  if (!ledgerId || !type || !amount || !categoryId) {
    return { success: false, errMsg: '参数不完整' };
  }

  // 验证用户是否为该账本成员
  const ledger = await db.collection('ledgers').doc(ledgerId).get();
  const memberOpenids = ledger.data.members.map(m => typeof m === 'string' ? m : m.openid);
  if (!ledger.data || !memberOpenids.includes(wxContext.OPENID)) {
    return { success: false, errMsg: '无权访问此账本' };
  }

  try {
    const result = await db.collection('transactions').add({
      data: {
        _openid: wxContext.OPENID,
        ledgerId,
        type,
        amount: Number(amount),
        categoryId,
        categoryName,
        categoryIcon,
        note: note || '',
        date,
        method: method || 'manual',
        creatorName: creatorName || '我',
        assignTo: assignTo || wxContext.OPENID,
        createTime: new Date().toISOString(),
      },
    });
    return { success: true, _id: result._id };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

const getTransactions = async (event) => {
  const { ledgerId, year, month, page = 0, pageSize = 20 } = event.data;

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  try {
    const result = await db.collection('transactions')
      .where({
        ledgerId,
        date: _.and(_.gte(startDate), _.lt(endDate)),
      })
      .orderBy('createTime', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get();

    return { success: true, data: result.data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

const getMonthSummary = async (event) => {
  const { ledgerId, year, month } = event.data;

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  try {
    const result = await db.collection('transactions')
      .where({
        ledgerId,
        date: _.and(_.gte(startDate), _.lt(endDate)),
      })
      .limit(1000)
      .get();

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = {};

    result.data.forEach(item => {
      if (item.type === 'income') {
        totalIncome += item.amount;
      } else {
        totalExpense += item.amount;
        if (!categoryMap[item.categoryId]) {
          categoryMap[item.categoryId] = {
            categoryId: item.categoryId,
            name: item.categoryName,
            icon: item.categoryIcon,
            amount: 0,
          };
        }
        categoryMap[item.categoryId].amount += item.amount;
      }
    });

    const categoryStats = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);
    const maxAmount = categoryStats.length > 0 ? categoryStats[0].amount : 1;
    categoryStats.forEach(item => {
      item.percent = Math.round((item.amount / maxAmount) * 100);
    });

    return {
      success: true,
      data: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpense: Math.round(totalExpense * 100) / 100,
        balance: Math.round((totalIncome - totalExpense) * 100) / 100,
        categoryStats,
      },
    };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

const deleteTransaction = async (event) => {
  const wxContext = cloud.getWXContext();
  const { _id } = event.data;

  try {
    await db.collection('transactions')
      .where({ _id, _openid: wxContext.OPENID })
      .remove();
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// ============ 账本管理 ============

const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const createLedger = async (event) => {
  const wxContext = cloud.getWXContext();
  const { name } = event.data;

  if (!name) {
    return { success: false, errMsg: '请输入账本名称' };
  }

  try {
    const result = await db.collection('ledgers').add({
      data: {
        _openid: wxContext.OPENID,
        name,
        inviteCode: generateInviteCode(),
        members: [{ openid: wxContext.OPENID, name: '管理员', role: 'admin' }],
        createTime: new Date().toISOString(),
      },
    });
    return { success: true, _id: result._id };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

const joinLedger = async (event) => {
  const wxContext = cloud.getWXContext();
  const { inviteCode, memberName } = event.data;

  if (!inviteCode) {
    return { success: false, errMsg: '请输入邀请码' };
  }

  try {
    const result = await db.collection('ledgers')
      .where({ inviteCode })
      .get();

    if (result.data.length === 0) {
      return { success: false, errMsg: '邀请码无效' };
    }

    const ledger = result.data[0];
    const memberOpenids = ledger.members.map(m => typeof m === 'string' ? m : m.openid);
    if (memberOpenids.includes(wxContext.OPENID)) {
      return { success: false, errMsg: '你已在此账本中' };
    }

    await db.collection('ledgers').doc(ledger._id).update({
      data: {
        members: _.push({
          openid: wxContext.OPENID,
          name: memberName || '成员',
          role: 'member',
        }),
      },
    });

    return { success: true, ledgerId: ledger._id, name: ledger.name };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

const getMyLedgers = async () => {
  const wxContext = cloud.getWXContext();

  try {
    // 先查所有账本，再在内存中过滤成员
    const result = await db.collection('ledgers')
      .orderBy('createTime', 'asc')
      .limit(100)
      .get();

    const myOpenid = wxContext.OPENID;
    const ledgers = result.data.filter(ledger => {
      if (!ledger.members) return false;
      return ledger.members.some(m => {
        const openid = typeof m === 'string' ? m : m.openid;
        return openid === myOpenid;
      });
    });

    // 兼容旧数据：members 可能是纯 openid 数组
    ledgers.forEach(ledger => {
      if (ledger.members && ledger.members.length > 0 && typeof ledger.members[0] === 'string') {
        ledger.members = ledger.members.map((openid, i) => ({
          openid,
          name: i === 0 ? '管理员' : '成员',
          role: i === 0 ? 'admin' : 'member',
        }));
      }
    });

    return { success: true, data: ledgers };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// ============ 预算管理 ============

const setBudget = async (event) => {
  const wxContext = cloud.getWXContext();
  const { ledgerId, categoryId, categoryName, amount, year, month } = event.data;

  if (!ledgerId || !categoryId || !amount) {
    return { success: false, errMsg: '参数不完整' };
  }

  try {
    const existing = await db.collection('budgets')
      .where({ ledgerId, categoryId, year, month })
      .get();

    if (existing.data.length > 0) {
      await db.collection('budgets').doc(existing.data[0]._id).update({
        data: { amount: Number(amount), categoryName },
      });
    } else {
      await db.collection('budgets').add({
        data: {
          _openid: wxContext.OPENID,
          ledgerId,
          categoryId,
          categoryName,
          amount: Number(amount),
          year,
          month,
        },
      });
    }

    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

const getBudgetStatus = async (event) => {
  const { ledgerId, year, month } = event.data;

  try {
    const budgetRes = await db.collection('budgets')
      .where({ ledgerId, year, month })
      .limit(100)
      .get();

    if (budgetRes.data.length === 0) {
      return { success: true, data: [] };
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const txRes = await db.collection('transactions')
      .where({
        ledgerId,
        type: 'expense',
        date: _.and(_.gte(startDate), _.lt(endDate)),
      })
      .limit(1000)
      .get();

    const spentMap = {};
    txRes.data.forEach(tx => {
      if (!spentMap[tx.categoryId]) {
        spentMap[tx.categoryId] = 0;
      }
      spentMap[tx.categoryId] += tx.amount;
    });

    const budgetList = budgetRes.data.map(b => ({
      categoryId: b.categoryId,
      categoryName: b.categoryName,
      amount: b.amount,
      spent: Math.round((spentMap[b.categoryId] || 0) * 100) / 100,
    }));

    return { success: true, data: budgetList };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// ============ 成员统计 ============

const getMemberStats = async (event) => {
  const { ledgerId, year, month } = event.data;

  try {
    const ledger = await db.collection('ledgers').doc(ledgerId).get();
    const members = ledger.data.members || [];

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const txRes = await db.collection('transactions')
      .where({
        ledgerId,
        type: 'expense',
        date: _.and(_.gte(startDate), _.lt(endDate)),
      })
      .limit(1000)
      .get();

    const spentMap = {};
    txRes.data.forEach(tx => {
      const key = tx.assignTo || tx._openid;
      if (!spentMap[key]) {
        spentMap[key] = 0;
      }
      spentMap[key] += tx.amount;
    });

    let totalExpense = 0;
    const memberStats = members.map(m => {
      const openid = typeof m === 'string' ? m : m.openid;
      const name = typeof m === 'string' ? '成员' : m.name;
      const role = typeof m === 'string' ? 'member' : (m.role || 'member');
      const spent = Math.round((spentMap[openid] || 0) * 100) / 100;
      totalExpense += spent;
      return { openid, name, role, spent };
    });

    return {
      success: true,
      data: {
        members: memberStats,
        totalExpense: Math.round(totalExpense * 100) / 100,
      },
    };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// ============ OCR 小票识别 ============

const ocrReceipt = async (event) => {
  const { fileID } = event.data;

  try {
    // TODO: 接入真实 OCR API（如腾讯云 OCR）
    const merchants = ['全家便利店', '星巴克', '大众点评', '美团外卖', '沃尔玛', '滴滴出行', '京东商城'];
    const categories = [
      { id: 1, name: '餐饮', badgeClass: 'food' },
      { id: 2, name: '购物', badgeClass: 'shop' },
      { id: 3, name: '交通', badgeClass: 'trans' },
    ];

    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const amount = Math.round((Math.random() * 200 + 10) * 100) / 100;
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return {
      success: true,
      data: {
        merchant,
        amount,
        date,
        categoryId: cat.id,
        categoryName: cat.name,
        badgeClass: cat.badgeClass,
        fileID,
      },
    };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// ============ 入口 ============

exports.main = async (event, context) => {
  switch (event.type) {
    case 'getOpenId':
      return await getOpenId();
    case 'addTransaction':
      return await addTransaction(event);
    case 'getTransactions':
      return await getTransactions(event);
    case 'getMonthSummary':
      return await getMonthSummary(event);
    case 'deleteTransaction':
      return await deleteTransaction(event);
    case 'createLedger':
      return await createLedger(event);
    case 'joinLedger':
      return await joinLedger(event);
    case 'getMyLedgers':
      return await getMyLedgers();
    case 'setBudget':
      return await setBudget(event);
    case 'getBudgetStatus':
      return await getBudgetStatus(event);
    case 'getMemberStats':
      return await getMemberStats(event);
    case 'ocrReceipt':
      return await ocrReceipt(event);
    default:
      return { success: false, errMsg: '未知操作类型: ' + event.type };
  }
};
