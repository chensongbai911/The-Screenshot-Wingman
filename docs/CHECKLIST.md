# ChatWiz Week 1 快速检查清单

日期：2025-12-23
版本：v1.0
使用：打印此清单，每完成一项打勾 ✓

---

## 📋 Day 1-2：项目工程初始化

### 工作清单

#### Git 仓库与权限（负责：后端 Lead）
- [ ] 创建 GitHub / GitLab 仓库
- [ ] 创建 main 分支与开发分支（develop / feature/...）
- [ ] 配置分支保护规则（禁止直接 push main）
- [ ] 邀请团队成员并分配权限
- [ ] 配置 Code Review 流程（PR review required）
- [ ] 创建 `.gitignore` 文件
- [ ] 创建 `.env.example` 文件
- [ ] 第一次 commit：初始化项目结构

#### 项目结构创建（负责：全体）
- [ ] 创建前端目录：pages / components / utils / styles
- [ ] 创建后端目录：cloud/functions / cloud/database / docs
- [ ] 文件夹权限无误（755 或相等）
- [ ] 验证：`tree -L 3 -I node_modules` 输出正确

#### 本地开发环境（负责：全体）
- [ ] Node.js >= 14 已安装：`node --version`
- [ ] npm >= 6 已安装：`npm --version`
- [ ] 微信开发者工具已安装并可打开
- [ ] CloudBase CLI 已安装：`npm install -g @cloudbase/cli`
- [ ] VS Code + 扩展已安装（Prettier、ESLint、WXMLX）
- [ ] 各团队成员环境检查通过

#### 文档初始化（负责：PM）
- [ ] `README.md` 已完成
- [ ] `docs/WEEK1.md` 已完成
- [ ] `package.json` 已完成
- [ ] 文档已推送到仓库
- [ ] 所有成员已收到文档链接

### 验收标准 Day 1-2
- ✅ Git 仓库可访问，所有开发人员有权限
- ✅ 项目结构清晰，符合规范
- ✅ 所有团队成员环境已就绪
- ✅ 第一次 commit 已完成

---

## 📋 Day 3-4：CloudBase 环境初始化

### 工作清单

#### CloudBase 项目创建（负责：后端 Lead）
- [ ] 登录微信云开发控制台
- [ ] 创建开发环境：`chatwiz-dev`
  - [ ] 区域选择：华东
  - [ ] 环境确认创建成功
- [ ] 获取 `ENVIRONMENT_ID`：`ch-xxx-xxxx`
- [ ] 获取 `APP_ID`：`wxxxxxxxxxxx`
- [ ] 获取 `SECRET_KEY`（妥善保管！）
- [ ] 记录信息到 `.env.example`

#### CloudBase 本地连接（负责：后端 Lead + 后端开发）
- [ ] 执行：`cloudbase init --path ./cloud`
- [ ] 生成 `cloud/cloudbaserc.json`
- [ ] 测试连接：`cloudbase database:list`
- [ ] 输出显示 5 个 collection 名称（还未创建，仅列出计划）
- [ ] 配置成功，无错误信息

#### 环境隔离配置（负责：后端 Lead）
- [ ] 创建 `.env.dev` 文件
  - [ ] CLOUDBASE_ENV_ID_DEV=ch-xxx-xxxx
  - [ ] CLOUDBASE_APP_ID_DEV=wx...
  - [ ] 其他配置
- [ ] 创建 `.env.prod` 文件
  - [ ] 生产环境配置（可暂时使用测试值）
  - [ ] DEEPSEEK_API_KEY（临时测试 key）
- [ ] `.env.dev` 和 `.env.prod` 已加入 `.gitignore`
- [ ] 修改 cloudbaserc.json 支持环境变量

#### 云函数配置（负责：后端）
- [ ] 在 CloudBase 控制台启用云函数
- [ ] 配置 Node.js 运行环境：v14 或 v16
- [ ] 配置超时时间：60s
- [ ] 配置内存：256MB
- [ ] 配置环境变量访问权限

### 验收标准 Day 3-4
- ✅ CloudBase 环境已创建（dev 环境）
- ✅ `cloudbase database:list` 命令执行成功
- ✅ `.env.example` 已填入真实的 ENVIRONMENT_ID、APP_ID
- ✅ 所有开发人员可访问 CloudBase 控制台

---

## 📋 Day 4-5：数据库 Schema 设计

### 工作清单

#### Collection 定义（负责：后端 Lead）
- [ ] 文件 `cloud/database/schema.md` 已完成
  - [ ] users collection schema ✓
  - [ ] analysis_tasks collection schema ✓
  - [ ] wallet_ledger collection schema ✓
  - [ ] orders collection schema ✓
  - [ ] risk_logs collection schema ✓
- [ ] 所有字段、类型、备注已齐全

#### 索引设计（负责：后端）
- [ ] 索引规划文档已完成（见 schema.md）
  - [ ] users: createdAt, lastActiveAt
  - [ ] analysis_tasks: (openid,createdAt), status, _id
  - [ ] wallet_ledger: (openid,createdAt), ref.taskId, ref.orderId
  - [ ] orders: orderNo(unique), (openid,createdAt), status
  - [ ] risk_logs: taskId, (openid,createdAt), stage
- [ ] 索引总数：9 个
- [ ] 验证：没有遗漏或重复索引

#### 权限配置（负责：后端）
- [ ] CRAD 规则文档已完成（见 schema.md）
- [ ] users 规则：读自己，云函数写
- [ ] analysis_tasks 规则：读自己，云函数+自己写
- [ ] wallet_ledger 规则：读自己，云函数写
- [ ] orders 规则：读自己，云函数写
- [ ] risk_logs 规则：仅云函数读写
- [ ] 规则已以 JSON 格式记录

#### 数据库验证（当 CloudBase 环境就绪后）
- [ ] 使用 CloudBase 控制台手动创建测试数据
- [ ] 执行：`cloudbase database:query users --limit 10`
- [ ] 输出显示测试数据
- [ ] 数据库连接无误

### 验收标准 Day 4-5
- ✅ `cloud/database/schema.md` 文档完整
- ✅ 5 个 collection、9 个索引已规划
- ✅ CRAD 权限规则已定义
- ✅ 数据库容量估算已完成（预留 10GB）

---

## 📋 Day 5-6：云函数框架搭建

### 工作清单

#### 云函数目录结构（负责：后端 Lead）
- [ ] 创建 `cloud/functions/authEnsureUser/` 目录
- [ ] 创建 `cloud/functions/createTask/` 目录
- [ ] 创建 `cloud/functions/bindUpload/` 目录
- [ ] 创建 `cloud/functions/runOCR/` 目录
- [ ] 创建 `cloud/functions/fixRoles/` 目录
- [ ] 创建 `cloud/functions/runLLM/` 目录
- [ ] 创建 `cloud/functions/cleanupTaskAssets/` 目录
- [ ] 创建 `cloud/functions/msgSecCheck/` 目录
- [ ] 创建 `cloud/functions/shared/` 目录

#### 共享库实现（负责：后端）
- [ ] 实现 `cloud/shared/db.js`（数据库连接与操作）
- [ ] 实现 `cloud/shared/error.js`（错误定义）
- [ ] 实现 `cloud/shared/logger.js`（日志记录）
- [ ] 实现 `cloud/shared/auth.js`（认证工具）
- [ ] 验证：代码无语法错误

#### authEnsureUser 实现（负责：后端）
- [ ] `cloud/functions/authEnsureUser/index.js` 已实现
  - [ ] 获取 OpenID ✓
  - [ ] 查询 users collection ✓
  - [ ] 创建新用户 ✓
  - [ ] 赠送 1 点 ✓
  - [ ] 记录账本 ✓
  - [ ] 返回用户信息 ✓
- [ ] `cloud/functions/authEnsureUser/package.json` 已创建
  - [ ] 依赖：wx-server-sdk

#### 云函数框架搭建（负责：后端）
- [ ] 其他 7 个云函数的框架已创建（可先为空）
  - [ ] createTask/index.js（框架）
  - [ ] bindUpload/index.js（框架）
  - [ ] runOCR/index.js（框架）
  - [ ] fixRoles/index.js（框架）
  - [ ] runLLM/index.js（框架）
  - [ ] cleanupTaskAssets/index.js（框架）
  - [ ] msgSecCheck/index.js（框架）
- [ ] 每个云函数的 package.json 已创建
- [ ] 所有文件已提交到 Git

#### 云函数部署与测试（负责：后端）
- [ ] 执行：`cloudbase functions:deploy authEnsureUser`
- [ ] 部署成功，无错误
- [ ] 在微信开发者工具中调用 `authEnsureUser`
- [ ] 返回正确的用户数据
- [ ] 检查数据库：users collection 中已创建新用户

### 验收标准 Day 5-6
- ✅ 所有云函数目录已创建
- ✅ 共享库已实现并通过测试
- ✅ authEnsureUser 已部署并可调用
- ✅ 用户数据已正确写入数据库

---

## 📋 Day 6-7：前端项目结构

### 工作清单

#### 小程序配置（负责：前端 Lead）
- [ ] 创建 `frontend/app.json`
  - [ ] pages 配置（index、analyzing、rolefix、result、wallet、history）
  - [ ] window 配置（导航栏颜色、文字）
  - [ ] tabBar 配置（分析、钱包、历史）
  - [ ] networkTimeout 配置
- [ ] 验证：JSON 格式正确

#### 首页实现（负责：前端）
- [ ] 创建 `frontend/pages/index/` 目录
- [ ] 创建 `frontend/pages/index/index.wxml`
  - [ ] 顶部栏（标题 + 副标题）
  - [ ] 点数显示条
  - [ ] 上传按钮 + 预览
  - [ ] 关系选择（胶囊）
  - [ ] 目标选择（胶囊）
  - [ ] 隐私声明 + checkbox
  - [ ] 开始分析按钮
- [ ] 创建 `frontend/pages/index/index.js`
  - [ ] data 定义 ✓
  - [ ] 上传图片逻辑 ✓
  - [ ] 参数选择逻辑 ✓
  - [ ] 开始分析逻辑 ✓
- [ ] 创建 `frontend/pages/index/index.wxss`
  - [ ] 所有样式已完成

#### 小程序全局配置（负责：前端）
- [ ] 创建 `frontend/app.js`
  - [ ] CloudBase 初始化 ✓
  - [ ] 用户认证流程 ✓
  - [ ] globalData 定义 ✓
- [ ] 创建 `frontend/app.wxss`
  - [ ] 全局样式（颜色、字体、间距）
- [ ] 创建 `frontend/project.config.json`
  - [ ] appid 配置
  - [ ] projectname 配置

#### 样式系统（负责：前端）
- [ ] 颜色系统已定义（主色、警示、背景等）
- [ ] 字体层级已定义（标题、正文、注释）
- [ ] 组件样式已定义（按钮、卡片、胶囊）
- [ ] 全局样式文件已完成

#### 开发工具配置（负责：前端 Lead）
- [ ] 在微信开发者工具中打开 `frontend` 文件夹
- [ ] 填入 appid
- [ ] 编译成功，无错误
- [ ] 首页能正常显示

### 验收标准 Day 6-7
- ✅ `frontend/app.json` 配置完整
- ✅ 首页 (index) 能显示并交互
- ✅ 样式系统规范清晰
- ✅ 能在微信开发者工具中正常编译

---

## 📋 Day 7：集成测试与验收

### 功能集成测试（负责：QA）
- [ ] 打开微信开发者工具，加载前端
- [ ] 点击首页"让军师看看"按钮
- [ ] 弹窗：请选择截图并同意隐私声明
- [ ] 选择图片后，按钮变为可用
- [ ] 勾选隐私声明，按钮完全可用
- [ ] （暂时停留在首页，Week 2 后续流程）

#### authEnsureUser 集成测试
- [ ] 页面加载时自动调用 authEnsureUser
- [ ] 返回用户信息，点数正确显示
- [ ] 数据库 users collection 中有新用户记录

### 部署检查清单（负责：全体）
- [ ] ✅ Git 仓库所有文件已提交
- [ ] ✅ 所有环境变量已配置（.env.dev）
- [ ] ✅ CloudBase 数据库可正常访问
- [ ] ✅ authEnsureUser 云函数已部署
- [ ] ✅ 前端可以正常编译并调用云函数
- [ ] ✅ 没有 console 错误或警告（关键错误）

### 文档完善（负责：PM）
- [ ] `docs/WEEK1.md` 内容已更新
- [ ] `docs/API.md` 已完成（框架）
- [ ] `cloud/database/schema.md` 已完成
- [ ] `docs/PROGRESS.md` 已更新
- [ ] README.md 中的关键信息已验证

### 验收标准 Day 7
- ✅ 所有功能测试通过
- ✅ 部署检查清单全部勾选
- ✅ 文档完整且无误
- ✅ Week 1 完成，可启动 Week 2

---

## 🎯 Week 1 最终验收清单

### 开发环境 ✓
- [ ] Node.js / npm / CloudBase CLI 就绪
- [ ] 微信开发者工具可正常打开项目
- [ ] VS Code 扩展已安装
- [ ] 所有开发人员环境一致

### 代码仓库 ✓
- [ ] Git 仓库已建立，分支策略完善
- [ ] `.gitignore` 与 `.env.example` 已配置
- [ ] 所有文件已提交，无遗漏
- [ ] 可追踪的提交历史（commit message 规范）

### CloudBase 环境 ✓
- [ ] 开发环境已创建（ch-xxx-xxxx）
- [ ] 本地连接已验证
- [ ] 环境变量已配置
- [ ] 云函数运行环境已配置

### 数据库 Schema ✓
- [ ] 5 个 collection 结构已定义
- [ ] 9 个索引已规划
- [ ] CRAD 权限规则已定义
- [ ] 容量估算已完成

### 云函数框架 ✓
- [ ] 共享库已实现（db / error / logger）
- [ ] authEnsureUser 已实现并部署
- [ ] 其他 7 个云函数框架已创建
- [ ] 可正常调用，无错误

### 前端项目 ✓
- [ ] app.json 配置完整
- [ ] 首页 UI 完整可用
- [ ] 样式系统清晰规范
- [ ] 能正常编译，无关键错误

### 文档 ✓
- [ ] README.md 已完成
- [ ] WEEK1.md 已完成
- [ ] API.md 已完成（框架）
- [ ] schema.md 已完成
- [ ] PROGRESS.md 已完成

---

## 📞 遇到问题？

1. **CloudBase 权限问题**
   👉 检查微信账号是否有云开发权限

2. **authEnsureUser 报错 UNAUTHORIZED**
   👉 检查云函数是否启用了"身份验证"

3. **npm install 失败**
   👉 更换 npm 源：`npm config set registry https://registry.npmmirror.com`

4. **微信开发者工具编译失败**
   👉 检查 `project.config.json` 中的 appid 是否正确

5. **数据库查询返回空**
   👉 确认数据已写入，检查权限规则是否正确

---

## ✅ 签名与确认

**项目经理**：________________  日期：___________
**技术 Lead**：________________  日期：___________
**前端 Lead**：________________  日期：___________
**后端 Lead**：________________  日期：___________
**QA Lead**：________________  日期：___________

---

**祝 Week 1 顺利完成！** 🚀

下周见：Week 2 - 图片上传 + OCR 识别

