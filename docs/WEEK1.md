## 📅 Week 1 - 工程搭建 + 数据库设计

**时间范围**：2025-12-23 ~ 2025-12-29
**目标**：项目工程框架完成，CloudBase 环境就绪，数据库 Schema 设计完毕
**关键里程碑**：authEnsureUser 云函数可用

---

## 🎯 Week 1 核心任务

### 任务 1：项目工程初始化 (Day 1-2)

#### 1.1 Git 仓库与权限
- [ ] 创建 GitHub / GitLab 仓库
- [ ] 创建 main / develop / feature 分支
- [ ] 配置分支保护规则（必须 PR review）
- [ ] 邀请团队成员，分配权限（开发 / 审核 / 管理员）
- [ ] 创建 `.gitignore` 和 `.env.example`

**Checklist**：
```bash
# .gitignore 内容
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
miniprogram_npm/
```

#### 1.2 项目结构
- [ ] 创建前端目录结构（pages / components / utils / styles）
- [ ] 创建后端目录结构（functions / database / config）
- [ ] 创建文档目录（docs / README）
- [ ] 初始化 `package.json`（依赖管理）

**验证方式**：
```bash
# 项目结构检查
tree -L 3 -I node_modules
```

#### 1.3 本地开发环境
- [ ] 安装 Node.js (>= 14) 和 npm
- [ ] 安装微信开发者工具
- [ ] 安装 CloudBase CLI：`npm install -g @cloudbase/cli`
- [ ] 安装代码编辑器（VS Code）+ 扩展
  - Prettier（代码格式化）
  - ESLint（代码检查）
  - WXMLX（小程序标签高亮）

**验证**：
```bash
node --version          # >= v14.0.0
npm --version           # >= 6.0.0
cloudbase --version     # >= 2.0.0
```

---

### 任务 2：CloudBase 环境初始化 (Day 3-4)

#### 2.1 CloudBase 项目创建
- [ ] 在微信云开发控制台新建环境
  - 环境名：`chatwiz-dev` (开发) / `chatwiz-prod` (生产)
  - 区域：选择用户主要地区（推荐华东）
- [ ] 获取 `ENVIRONMENT_ID`
- [ ] 获取 `AppID` 与 `SecretKey`

**记录到 `.env.example`**：
```env
CLOUDBASE_ENV_ID=ch-xxx-xxxx
CLOUDBASE_APP_ID=wx1234567890abcdef
CLOUDBASE_SECRET_KEY=your_secret_key_here
DEEPSEEK_API_KEY=sk-xxxx
```

#### 2.2 CloudBase 本地连接
- [ ] 初始化 CloudBase：`cloudbase init --path ./cloud`
- [ ] 生成 `cloud/cloudbaserc.json`
- [ ] 测试连接：`cloudbase database:list`
- [ ] 配置 IAM 角色（云函数执行权限）

**cloudbaserc.json 示例**：
```json
{
  "envId": "ch-xxx-xxxx",
  "appId": "wxd7b17df348c02834",
  "secretKey": "your_secret_key_here",
  "functions": {
    "runtime": "Nodejs14",
    "memorySize": 256,
    "timeout": 60
  },
  "database": {
    "collections": [
      "users",
      "analysis_tasks",
      "wallet_ledger",
      "orders",
      "risk_logs"
    ]
  }
}
```

#### 2.3 开发环境 vs 生产环境
- [ ] 配置 `.env.dev` 和 `.env.prod`
- [ ] 前端配置环境切换
- [ ] 云函数配置环境适配

---

### 任务 3：数据库 Schema 设计 (Day 4-5)

#### 3.1 创建 5 个 Collection

**Collection 1: `users`**
```javascript
{
  _id: String,           // OpenID (主键)
  credits: Number,       // 当前点数
  freeCreditsGranted: Boolean,  // 是否已发放新手赠送
  settings: Object,      // {historyEnabled, privacyAccepted, ...}
  createdAt: Date,
  lastActiveAt: Date,
  lastDeductedAt: Date,  // 防重复扣费标记
  lastDeductedTaskId: String
}
```

**Collection 2: `analysis_tasks`**
```javascript
{
  _id: String,           // 自动生成
  openid: String,        // 用户 OpenID
  status: String,        // created|uploaded|ocr_done|llm_done|deleted_assets|error
  relationType: String,  // 可空：追求中|暧昧期|恋人|上下级|同事|甲方乙方
  goalType: String,      // 可空：目标类型
  image: {
    fileId: String,      // 云存储 FileID
    uploadedAt: Date
  },
  ocr: {
    messages: Array,     // [{role, text, confidence}, ...]
    needRoleFix: Boolean,
    confidence: Number
  },
  llm: {
    result: Object,      // {profile_one_liner, emotion, intent, strategy, replies, ...}
    deep_report: Object  // 深度报告（可选）
  },
  safety: {
    status: String,      // pass|fail|unverified
    suggest: String,     // block|review
    rewritten: Boolean,
    flaggedFields: Array
  },
  cost: {
    creditsCharged: Number  // 总扣费数
  },
  error: String,         // 错误信息（若 status=error）
  createdAt: Date,
  updatedAt: Date
}
```

**Collection 3: `wallet_ledger`**
```javascript
{
  _id: String,
  openid: String,
  type: String,          // analysis|deep_report|refresh_replies|purchase|refund
  delta: Number,         // 增减数额（+/- 整数）
  balanceAfter: Number,  // 操作后余额
  ref: {
    taskId: String,
    orderId: String
  },
  reason: String,        // LLM_failure|msgSecCheck_block|user_request
  createdAt: Date
}
```

**Collection 4: `orders`**
```javascript
{
  _id: String,
  orderNo: String,       // 唯一订单号
  openid: String,
  productId: String,     // 5points|20points
  amountFen: Number,     // 金额（分）
  status: String,        // pending|paid|shipped|completed|cancelled
  creditsAdded: Number,  // 加点数
  paidAt: Date,
  metadata: Object       // 支付回调数据
}
```

**Collection 5: `risk_logs`**
```javascript
{
  _id: String,
  openid: String,
  taskId: String,
  stage: String,         // ocr|llm|display|payment
  reason: String,        // 风险原因
  detail: Object,        // 详细信息
  createdAt: Date
}
```

#### 3.2 创建索引（性能优化）
- [ ] users: (createdAt)
- [ ] analysis_tasks: (openid, createdAt desc), (status), (taskId)
- [ ] wallet_ledger: (openid, createdAt desc)
- [ ] orders: (orderNo unique), (openid, createdAt desc)
- [ ] risk_logs: (taskId), (openid, createdAt desc)

**创建索引命令**：
```bash
cloudbase database:create-index users -k createdAt -a
cloudbase database:create-index analysis_tasks -k openid,createdAt -u false -o desc
cloudbase database:create-index analysis_tasks -k status
```

#### 3.3 权限配置
- [ ] 配置云读写权限（针对各 collection）
  - users：仅用户自己可读 + 云函数可写
  - analysis_tasks：用户自己 + 云函数
  - wallet_ledger：用户只读 + 云函数写
  - 其他：云函数专享

**云读写规则示例**（CRAD：Cloud Read And write Data）：
```json
{
  "users": {
    "read": "doc._id == auth.uid",
    "write": "doc._id == auth.uid",
    "create": false,
    "update": false,
    "delete": false
  },
  "analysis_tasks": {
    "read": "doc.openid == auth.uid",
    "write": "auth.uid != null",
    "create": "auth.uid != null",
    "update": "auth.uid != null && doc.openid == auth.uid",
    "delete": false
  }
}
```

#### 3.4 验证数据库
- [ ] 在控制台手动创建测试数据
- [ ] 本地查询验证：`cloudbase database:query users`
- [ ] 导出 schema 定义：`docs/database/schema.md`

---

### 任务 4：云函数框架搭建 (Day 5-6)

#### 4.1 云函数目录结构
```
cloud/functions/
├── authEnsureUser/
│   ├── index.js
│   ├── package.json
│   └── config.js
├── createTask/
├── bindUpload/
├── runOCR/
├── fixRoles/
├── runLLM/
├── msgSecCheck/
├── cleanupTaskAssets/
├── refundCredits/
├── shared/
│   ├── db.js          # 数据库连接
│   ├── auth.js        # 认证工具
│   ├── error.js       # 错误处理
│   └── logger.js      # 日志
└── package.json       # 共享依赖
```

#### 4.2 创建基础工具库

**cloud/shared/db.js**
```javascript
const cloud = require('wx-server-sdk');

class DBClient {
  constructor() {
    this.db = cloud.database();
  }

  async getUser(openid) {
    const result = await this.db
      .collection('users')
      .doc(openid)
      .get();
    return result.data;
  }

  async createTask(taskData) {
    const result = await this.db
      .collection('analysis_tasks')
      .add({
        ...taskData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    return result._id;
  }

  // ... 更多方法
}

module.exports = new DBClient();
```

**cloud/shared/error.js**
```javascript
class APIError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  OCR_FAILED: 'OCR_FAILED',
  LLM_FAILED: 'LLM_FAILED',
  MSGCHECK_FAILED: 'MSGCHECK_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR'
};

module.exports = { APIError, ErrorCodes };
```

#### 4.3 实现 authEnsureUser 云函数

**cloud/functions/authEnsureUser/index.js**
```javascript
const cloud = require('wx-server-sdk');
const { APIError, ErrorCodes } = require('../../shared/error');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 1. 获取调用者 OpenID（需启用身份验证）
    const { OPENID } = cloud.getWXContext();

    if (!OPENID) {
      throw new APIError(
        ErrorCodes.UNAUTHORIZED,
        '未授权的请求'
      );
    }

    // 2. 查询用户是否存在
    const userDoc = await db.collection('users')
      .doc(OPENID)
      .get()
      .catch(() => null);

    let user;

    if (userDoc && userDoc.data) {
      // 用户已存在，更新 lastActiveAt
      user = userDoc.data;
      await db.collection('users')
        .doc(OPENID)
        .update({
          lastActiveAt: new Date()
        });
    } else {
      // 新用户，创建并发放新手赠送
      await db.collection('users')
        .doc(OPENID)
        .set({
          _id: OPENID,
          credits: 1,
          freeCreditsGranted: true,
          settings: {
            historyEnabled: true,
            privacyAccepted: false
          },
          createdAt: new Date(),
          lastActiveAt: new Date()
        });

      // 创建账本记录
      await db.collection('wallet_ledger')
        .add({
          openid: OPENID,
          type: 'new_user_bonus',
          delta: 1,
          balanceAfter: 1,
          reason: '新用户赠送',
          createdAt: new Date()
        });

      user = {
        _id: OPENID,
        credits: 1,
        freeCreditsGranted: true,
        settings: {
          historyEnabled: true,
          privacyAccepted: false
        }
      };
    }

    // 3. 返回用户信息
    return {
      code: 0,
      message: 'success',
      data: {
        openid: OPENID,
        credits: user.credits,
        settings: user.settings
      }
    };

  } catch (error) {
    console.error('authEnsureUser error:', error);

    if (error instanceof APIError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details
      };
    }

    return {
      code: ErrorCodes.DATABASE_ERROR,
      message: '服务器错误',
      error: error.message
    };
  }
};
```

**cloud/functions/authEnsureUser/package.json**
```json
{
  "name": "authEnsureUser",
  "version": "1.0.0",
  "description": "用户认证与初始化",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "^2.0.0"
  }
}
```

#### 4.4 部署与测试
- [ ] 部署 authEnsureUser 云函数
- [ ] 在微信开发者工具中测试调用
- [ ] 验证数据库中新建了 users 记录

**测试代码**（前端）：
```javascript
wx.cloud.callFunction({
  name: 'authEnsureUser',
  success: (res) => {
    console.log('User auth success:', res.result);
  },
  fail: (err) => {
    console.error('User auth error:', err);
  }
});
```

---

### 任务 5：前端项目结构 (Day 6-7)

#### 5.1 小程序配置

**frontend/app.json**
```json
{
  "pages": [
    "pages/index/index",
    "pages/analyzing/analyzing",
    "pages/rolefix/rolefix",
    "pages/result/result",
    "pages/wallet/wallet",
    "pages/history/history"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#6C5CE7",
    "navigationBarTitleText": "ChatWiz",
    "navigationBarTextStyle": "white",
    "navigationStyle": "custom"
  },
  "tabBar": {
    "color": "#86909C",
    "selectedColor": "#6C5CE7",
    "backgroundColor": "#FFFFFF",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "分析"
      },
      {
        "pagePath": "pages/wallet/wallet",
        "text": "钱包"
      },
      {
        "pagePath": "pages/history/history",
        "text": "历史"
      }
    ]
  },
  "networkTimeout": {
    "request": 10000,
    "connectSocket": 10000,
    "uploadFile": 10000,
    "downloadFile": 10000
  },
  "requiredPrivateInfos": [
    "getLocation"
  ]
}
```

**frontend/app.js**
```javascript
App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'ch-xxx-xxxx', // 替换为实际环境ID
        traceUser: true
      });
    }

    // 初始化用户
    this.initUser();
  },

  initUser() {
    wx.cloud.callFunction({
      name: 'authEnsureUser',
      success: (res) => {
        console.log('User initialized:', res.result);
        this.globalData.user = res.result.data;
        this.globalData.userReady = true;
      },
      fail: (err) => {
        console.error('Init user failed:', err);
      }
    });
  },

  globalData: {
    user: null,
    userReady: false
  }
});
```

#### 5.2 首页基础结构

**frontend/pages/index/index.wxml**
```xml
<view class="container">
  <!-- 顶部栏 -->
  <view class="header">
    <text class="title">ChatWiz</text>
    <text class="subtitle">把尴尬交给军师</text>
  </view>

  <!-- 点数显示 -->
  <view class="credits-bar">
    <text>剩余救急币: {{credits}}</text>
    <button bindtap="goWallet">购买</button>
  </view>

  <!-- 上传区域 -->
  <view class="upload-section">
    <button
      class="upload-btn {{imageSelected ? 'selected' : ''}}"
      bindtap="chooseImage"
    >
      {{imageSelected ? '重新选择' : '上传聊天截图'}}
    </button>
    <image wx:if="{{imageSelected}}" src="{{imagePath}}" mode="aspectFit" class="preview"></image>
  </view>

  <!-- 参数选择 -->
  <view class="params-section">
    <!-- 关系选择 -->
    <view class="param-card">
      <text class="label">关系背景（可选）</text>
      <view class="chips">
        <!-- 恋爱线 -->
        <view class="chip-group">
          <button
            wx:for="{{relationTypes.love}}"
            wx:key="id"
            class="chip {{selectedRelation === item.id ? 'active' : ''}}"
            bindtap="selectRelation"
            data-id="{{item.id}}"
          >
            {{item.label}}
          </button>
        </view>
        <!-- 职场线 -->
        <view class="chip-group">
          <button
            wx:for="{{relationTypes.work}}"
            wx:key="id"
            class="chip {{selectedRelation === item.id ? 'active' : ''}}"
            bindtap="selectRelation"
            data-id="{{item.id}}"
          >
            {{item.label}}
          </button>
        </view>
      </view>
    </view>

    <!-- 目标选择 -->
    <view class="param-card">
      <text class="label">我的目标（可选）</text>
      <view class="chips">
        <button
          wx:for="{{goalTypes}}"
          wx:key="id"
          class="chip {{selectedGoal === item.id ? 'active' : ''}}"
          bindtap="selectGoal"
          data-id="{{item.id}}"
        >
          {{item.label}}
        </button>
      </view>
    </view>
  </view>

  <!-- 隐私声明 -->
  <view class="privacy-section">
    <view class="checkbox">
      <checkbox
        value="{{privacyAccepted}}"
        bindchange="togglePrivacy"
      ></checkbox>
      <text>截图仅用于本次分析，完成后自动删除，绝不留存原图</text>
    </view>
    <view class="links">
      <button type="text" bindtap="showPrivacyPolicy">隐私政策</button>
      <button type="text" bindtap="showTerms">用户协议</button>
    </view>
  </view>

  <!-- 开始分析按钮 -->
  <button
    class="start-btn {{canStart ? '' : 'disabled'}}"
    bindtap="startAnalysis"
    disabled="{{!canStart}}"
  >
    让军师看看
  </button>
</view>
```

**frontend/pages/index/index.js**
```javascript
Page({
  data: {
    credits: 0,
    imageSelected: false,
    imagePath: '',
    selectedRelation: null,
    selectedGoal: null,
    privacyAccepted: false,

    relationTypes: {
      love: [
        { id: 'pursuing', label: '追求中' },
        { id: 'ambiguous', label: '暧昧期' },
        { id: 'dating', label: '恋人' }
      ],
      work: [
        { id: 'superior_subordinate', label: '上下级' },
        { id: 'colleague', label: '同事协作' },
        { id: 'client_vendor', label: '甲方乙方' }
      ]
    },
    goalTypes: [
      { id: 'no_cold_chat', label: '接话不冷场' },
      { id: 'push_relation', label: '推进关系' },
      { id: 'resolve_conflict', label: '化解冲突' },
      { id: 'push_back_task', label: '推回任务' },
      { id: 'reject_unreasonable', label: '拒绝无理要求' }
    ]
  },

  onLoad() {
    this.loadUserData();
  },

  loadUserData() {
    const app = getApp();
    if (app.globalData.user) {
      this.setData({
        credits: app.globalData.user.credits
      });
    }
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          imageSelected: true,
          imagePath: tempFilePath
        });
      }
    });
  },

  selectRelation(e) {
    this.setData({
      selectedRelation: e.currentTarget.dataset.id
    });
  },

  selectGoal(e) {
    this.setData({
      selectedGoal: e.currentTarget.dataset.id
    });
  },

  togglePrivacy(e) {
    this.setData({
      privacyAccepted: e.detail.value
    });
  },

  get canStart() {
    return this.data.imageSelected && this.data.privacyAccepted;
  },

  startAnalysis() {
    if (!this.canStart) {
      wx.showToast({
        title: '请选择截图并同意隐私声明',
        icon: 'none'
      });
      return;
    }

    // 跳转到分析页
    wx.navigateTo({
      url: '/pages/analyzing/analyzing?image=' + this.data.imagePath
    });
  },

  goWallet() {
    wx.navigateTo({
      url: '/pages/wallet/wallet'
    });
  },

  showPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '（隐私政策内容）',
      showCancel: false
    });
  },

  showTerms() {
    wx.showModal({
      title: '用户协议',
      content: '（用户协议内容）',
      showCancel: false
    });
  }
});
```

#### 5.3 样式配置

**frontend/app.wxss**
```css
/* 全局样式 */
page {
  background-color: #F7F8FA;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
  font-size: 16px;
  color: #1F2329;
}

/* 容器 */
.container {
  padding: 16px;
  min-height: 100vh;
}

/* 文本 */
.title {
  font-size: 24px;
  font-weight: bold;
  color: #1F2329;
}

.subtitle {
  font-size: 14px;
  color: #86909C;
  margin-top: 4px;
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: #1F2329;
}

/* 按钮 */
button {
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 16px;
  border: none;
  cursor: pointer;
}

button.primary {
  background-color: #6C5CE7;
  color: white;
}

button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 卡片 */
.card {
  background-color: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

**frontend/pages/index/index.wxss**
```css
.header {
  text-align: center;
  padding: 24px 0;
}

.title {
  font-size: 28px;
  font-weight: bold;
}

.subtitle {
  font-size: 14px;
  color: #86909C;
  margin-top: 8px;
}

.credits-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #FFF5E6;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 24px;
}

.upload-section {
  margin-bottom: 24px;
}

.upload-btn {
  width: 100%;
  background-color: #6C5CE7;
  color: white;
  padding: 16px;
  border-radius: 12px;
  font-size: 16px;
}

.upload-btn.selected {
  background-color: #5B4FCC;
}

.preview {
  width: 100%;
  height: 300px;
  border-radius: 12px;
  margin-top: 12px;
}

.params-section {
  margin-bottom: 24px;
}

.param-card {
  background-color: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.chip {
  padding: 8px 12px;
  border-radius: 20px;
  background-color: #F2F3F5;
  color: #1F2329;
  border: none;
  font-size: 14px;
}

.chip.active {
  background-color: #6C5CE7;
  color: white;
}

.privacy-section {
  background-color: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.checkbox {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.checkbox checkbox {
  margin-right: 8px;
}

.links {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.links button {
  font-size: 12px;
  color: #6C5CE7;
  padding: 0;
}

.start-btn {
  width: 100%;
  padding: 16px;
  background-color: #6C5CE7;
  color: white;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
}

.start-btn.disabled {
  opacity: 0.5;
}
```

---

### 任务 6：集成测试与验收 (Day 7)

#### 6.1 功能集成测试
- [ ] 前端能成功调用 authEnsureUser
- [ ] 用户数据正确保存到数据库
- [ ] 首页 UI 完整显示
- [ ] 所有交互响应正常

#### 6.2 部署检查清单
- [ ] 所有环境变量已配置
- [ ] CloudBase 数据库可访问
- [ ] authEnsureUser 云函数已部署
- [ ] 微信开发者工具能正确调用

#### 6.3 文档完善
- [ ] 更新 `docs/WEEK1.md` 进度
- [ ] 记录所有 API 端点到 `docs/API.md`
- [ ] 补充数据库 schema 到 `docs/database/schema.md`

---

## 📊 Week 1 进度跟踪

| 任务 | 状态 | 负责人 | 完成日期 |
|------|------|--------|---------|
| 1.1 Git 仓库初始化 | ⬜ | 后端 | - |
| 1.2 项目结构创建 | ⬜ | 全体 | - |
| 1.3 本地环境搭建 | ⬜ | 全体 | - |
| 2.1 CloudBase 创建 | ⬜ | 后端 | - |
| 2.2 本地连接配置 | ⬜ | 后端 | - |
| 2.3 环境隔离配置 | ⬜ | 后端 | - |
| 3.1 Collection 创建 | ⬜ | 后端 | - |
| 3.2 索引创建 | ⬜ | 后端 | - |
| 3.3 权限配置 | ⬜ | 后端 | - |
| 3.4 数据库验证 | ⬜ | 后端 | - |
| 4.1 云函数目录结构 | ⬜ | 后端 | - |
| 4.2 共享库实现 | ⬜ | 后端 | - |
| 4.3 authEnsureUser 实现 | ⬜ | 后端 | - |
| 4.4 云函数部署测试 | ⬜ | 后端 | - |
| 5.1 小程序配置 | ⬜ | 前端 | - |
| 5.2 首页 UI 实现 | ⬜ | 前端 | - |
| 5.3 样式配置 | ⬜ | 前端 | - |
| 6.1 功能集成测试 | ⬜ | QA | - |
| 6.2 部署检查 | ⬜ | 全体 | - |
| 6.3 文档完善 | ⬜ | PM | - |

---

## 🎯 Week 1 验收标准

✅ **开发环境**
- [ ] Node.js 与 npm 安装完毕
- [ ] 微信开发者工具可打开项目
- [ ] CloudBase CLI 可正常连接

✅ **代码仓库**
- [ ] Git 仓库已建立，分支策略就绪
- [ ] `.gitignore` 与 `.env.example` 已配置
- [ ] 团队成员权限已分配

✅ **CloudBase 环境**
- [ ] 开发环境与生产环境分离
- [ ] 5 个 collection 已创建
- [ ] 索引已建立（性能优化）
- [ ] 云读写权限已配置

✅ **数据库 Schema**
- [ ] users collection 结构正确
- [ ] analysis_tasks collection 结构正确
- [ ] wallet_ledger collection 结构正确
- [ ] orders collection 结构正确
- [ ] risk_logs collection 结构正确

✅ **云函数框架**
- [ ] authEnsureUser 云函数已实现
- [ ] 共享库（db / error / logger）已建立
- [ ] 云函数可正确部署与调用

✅ **前端项目**
- [ ] 小程序 app.json 配置完整
- [ ] 首页（index）UI 完整
- [ ] 样式系统已建立
- [ ] 能正确调用 authEnsureUser

✅ **文档**
- [ ] README.md 项目概览完整
- [ ] WEEK1.md 进度文档完整
- [ ] database/schema.md 数据库定义完整
- [ ] API.md 接口文档已建立框架

---

## 🔍 常见问题排查

### Q: CloudBase 初始化失败
A: 检查以下几点：
- [ ] 微信账号已登录开发者工具
- [ ] 小程序已在控制台注册云开发
- [ ] `ENVIRONMENT_ID` 填写正确
- [ ] 网络连接正常

### Q: authEnsureUser 无法获取 OpenID
A: 确保：
- [ ] 云函数已启用"身份验证"
- [ ] 小程序已正确初始化 `wx.cloud.init()`
- [ ] 在开发者工具中调用（不要在 H5 中测试）

### Q: 数据库权限错误
A: 检查：
- [ ] 云读写规则是否正确配置
- [ ] 用户是否已通过身份验证
- [ ] collection 是否设置为"仅云读写"

---

## 📞 沟通与反馈

每日 9:30 晨会同步进度，有问题及时在团队 Slack / 企业微信 提出。

**下周 Week 2 预览**：图片上传、OCR 识别、角色校正流程实现

