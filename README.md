# ChatWiz（聊天魔法师）- 项目工程文档

> 聊天截图军师 | 微信小程序 + 云开发版本

## 📋 项目概况

- **产品名称**：ChatWiz（聊天魔法师）
- **产品定位**：聊天截图军师，提供心理侧写+沟通策略+3风格可复制回复
- **目标用户**：18-40岁社交焦虑用户（恋爱/职场场景）
- **技术栈**：微信小程序 + CloudBase（云开发）+ DeepSeek API
- **项目周期**：v1.0 MVP (8周) → v1.1 增强 (4周) → v2.0 迭代

---

## 📁 项目结构

```
chatwiz-project/
├── frontend/                    # 微信小程序前端
│   ├── pages/                   # 页面（upload/analyzing/rolefix/result）
│   ├── components/              # 可复用组件
│   ├── utils/                   # 工具函数（api、storage、tracker等）
│   ├── styles/                  # 全局样式与主题
│   ├── app.js                   # 小程序入口
│   ├── app.json                 # 小程序配置
│   ├── app.wxss                 # 全局样式
│   └── package.json             # 依赖管理
│
├── cloud/                       # CloudBase 后端
│   ├── functions/               # 云函数目录
│   │   ├── authEnsureUser/      # 用户认证与初始化
│   │   ├── createTask/
│   │   ├── bindUpload/
│   │   ├── runOCR/
│   │   ├── fixRoles/
│   │   ├── runLLM/
│   │   ├── cleanupTaskAssets/
│   │   ├── msgSecCheck/
│   │   └── ...
│   │
│   ├── database/                 # 数据库 schema 与索引
│   │   ├── schema.md             # 集合定义
│   │   └── indexes.json          # 索引配置
│   │
│   └── cloudbaserc.json          # CloudBase 配置
│
├── docs/                        # 项目文档
│   ├── WEEK1.md                 # Week 1 进度与任务
│   ├── API.md                   # 云函数 API 文档
│   ├── PROMPT.md                # LLM Prompt 库
│   ├── ARCHITECTURE.md          # 技术架构
│   ├── CHECKLIST.md             # 验收清单
│   └── PROGRESS.md              # 整体进度追踪
│
├── .gitignore                   # Git 忽略文件
├── .env.example                 # 环境变量示例
└── package.json                 # 根目录依赖（可选）

```

---

## 🚀 快速开始

### 前置条件
- Node.js >= 14
- 微信开发者工具
- CloudBase CLI (`npm install -g @cloudbase/cli`)
- 微信小程序账号（开发版）

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/chensongbai911/The-Screenshot-Wingman.git chatwiz
cd chatwiz

# 2. 安装依赖
npm install
cd frontend && npm install
cd ../cloud && npm install

# 3. CloudBase 初始化
cloudbase init --path ./cloud

# 4. 配置环境变量
cp .env.example .env
# 修改 .env 中的 CLOUDBASE_ENV_ID、DEEPSEEK_API_KEY 等

# 5. 启动开发
# 前端：在微信开发者工具中打开 ./frontend
# 后端：cloudbase functions deploy
```

---

## 📅 Week 1 里程碑

### Week 1 目标
- ✅ 项目工程搭建完毕
- ✅ CloudBase 环境初始化
- ✅ 数据库 5 个 collection 创建
- ✅ 云函数框架搭建
- ✅ 前端基础项目结构
- ✅ authEnsureUser 云函数实现

### 具体任务
- [ ] Day 1-2：工程初始化、Git 仓库建立、团队权限配置
- [ ] Day 3-4：CloudBase 环境配置、数据库 schema 设计
- [ ] Day 5-6：云函数框架搭建、authEnsureUser 实现
- [ ] Day 7：前端项目结构、首页基础 UI、集成测试

进度详见 `docs/WEEK1.md`

---

## 🛠 开发指南

### 前端开发

```bash
cd frontend
npm run dev           # 开发模式
npm run build         # 生产构建
npm test              # 运行测试
```

### 后端开发

```bash
cd cloud
npm run dev           # 本地开发
npm run deploy        # 部署云函数
npm test              # 运行测试
```

### 数据库操作

```bash
# 查看数据库
cloudbase database:query users --limit 10

# 备份数据库
cloudbase database:export --collection users

# 恢复数据库
cloudbase database:import users users.json
```

---

## 📚 核心文档

| 文档 | 说明 | 负责人 |
|------|------|--------|
| `docs/WEEK1.md` | Week 1 详细任务与进度 | 项目经理 |
| `docs/API.md` | 云函数 API 完整规格 | 后端开发 |
| `docs/PROMPT.md` | LLM Prompt 库（恋爱+职场） | AI/LLM 工程师 |
| `docs/ARCHITECTURE.md` | 系统架构与流程图 | 架构师 |
| `docs/CHECKLIST.md` | 功能验收与测试清单 | QA |
| `docs/PROGRESS.md` | 整体进度追踪 | 项目经理 |

---

## 📊 关键指标

| 指标 | 目标值 | 当前值 | 进度 |
|------|------|--------|------|
| 新用户首分析完成率 | > 60% | - | - |
| 人均复制率 | > 80% | - | - |
| 基础→深度报告转化 | > 15% | - | - |
| 平均分析耗时 | < 12s | - | - |
| OCR 成功率 | > 90% | - | - |
| LLM 成功率 | > 95% | - | - |

---

## 🔒 安全与隐私

- 所有云函数均启用身份验证
- 隐私数据最小化存储
- 用户图片分析后立即删除
- 定时清理临时文件（24h）
- msgSecCheck 风控检测
- 数据备份与恢复方案

详见 `docs/SECURITY.md`

---

## 📞 团队沟通

### 工作日会议
- **每日晨会**：9:30 AM - 15 分钟
  - 进度同步、阻塞排查
- **周一全会**：2:00 PM - 60 分钟
  - 周计划、架构评审
- **周五总结**：4:00 PM - 30 分钟
  - 周回顾、下周规划

### 沟通渠道
- Slack / 企业微信：日常同步
- GitHub Issues：任务跟踪
- 文档 Wiki：知识共享

---

## 📝 提交规范

```bash
git commit -m "[FEATURE|BUG|DOCS] 简短描述 #ISSUE_ID"

# 示例
git commit -m "[FEATURE] 实现 authEnsureUser 云函数 #1"
git commit -m "[BUG] 修复 OCR 角色推断精度 #12"
git commit -m "[DOCS] 更新 Week 1 进度"
```

---

## 📜 许可证

© 2025 ChatWiz Team. All rights reserved.

---

## 🔄 更新日志

### 2025-12-23
- 项目初始化
- 完成需求文档分析
- 启动 Week 1 工程搭建

