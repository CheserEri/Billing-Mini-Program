---
name: wechat-miniapp-finance-app
description: 用于开发微信小程序记账项目（多人账本 + OCR + 云开发），强约束AI行为，防止生成Web框架代码
metadata:
  author: Hanser
  version: 1.0.0
  tags:
    - 微信小程序
    - 记账
    - 云开发
    - OCR
compatibility:
  - Codex CLI
  - Claude Code
  - Cursor
allowed-tools: Read Write Edit MultiEdit Bash
---

# 微信小程序记账项目技能约束

## 🎯 核心目标

本项目是：

👉 微信小程序财务记账系统

包含：

- 多人共享账本
- 小票OCR识别
- 云存储
- 收支统计

⚠️ 不是 Web 项目，禁止使用前端框架

---

# 🧱 技术栈限制

## 前端（必须）

- WXML
- WXSS
- JavaScript
- 微信小程序 API

## ❌ 禁止使用

- React / Vue / Next.js
- JSX / Hooks
- Tailwind
- 任意 Web 框架

---

## 后端（推荐）

使用：

👉 微信云开发（CloudBase）

包含：

- 云函数
- 云数据库
- 云存储

---

# 🏗️ 项目结构规则

必须遵循：
