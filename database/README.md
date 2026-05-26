# 数据库集合配置

在微信开发者工具 → 云开发控制台 → 数据库中，依次新建以下 3 个集合：

## 1. ledgers（账本）

权限：所有用户可读，仅创建者可读写

| 字段 | 类型 | 说明 |
|------|------|------|
| _openid | string | 创建者 openid（自动） |
| name | string | 账本名称 |
| inviteCode | string | 6位邀请码 |
| members | array | 成员列表 [{openid, name, role}] |
| createTime | string | 创建时间 |

## 2. transactions（交易记录）

权限：所有用户可读，仅创建者可读写

| 字段 | 类型 | 说明 |
|------|------|------|
| _openid | string | 录入者 openid（自动） |
| ledgerId | string | 所属账本 ID |
| type | string | expense / income |
| amount | number | 金额 |
| categoryId | number | 分类 ID |
| categoryName | string | 分类名称 |
| categoryIcon | string | 分类 emoji 图标 |
| note | string | 备注 |
| date | string | 日期 YYYY-MM-DD |
| method | string | manual / ocr |
| creatorName | string | 录入人昵称 |
| assignTo | string | 记到谁名下 |
| createTime | string | 创建时间 |

## 3. budgets（预算）

权限：所有用户可读，仅创建者可读写

| 字段 | 类型 | 说明 |
|------|------|------|
| _openid | string | 设置者 openid（自动） |
| ledgerId | string | 所属账本 ID |
| categoryId | number | 分类 ID |
| categoryName | string | 分类名称 |
| amount | number | 预算金额 |
| year | number | 年份 |
| month | number | 月份 1-12 |
