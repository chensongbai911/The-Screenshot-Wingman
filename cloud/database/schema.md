# ChatWiz 数据库 Schema 设计

## 概述

使用 CloudBase 数据库（MongoDB 兼容），共 5 个 collection，支持高并发与事务操作。

---

## 1. users Collection（用户信息表）

### 用途
存储用户账户信息、点数余额、设置等。

### Schema 定义

```javascript
{
  // 主键
  _id: String,                    // OpenID（微信唯一标识）

  // 积分系统
  credits: Number,                // 当前点数（整数）
  freeCreditsGranted: Boolean,    // 是否已发放新手赠送（防重复）

  // 用户设置
  settings: {
    historyEnabled: Boolean,      // 是否启用历史记录
    privacyAccepted: Boolean,     // 是否同意隐私政策
    privacyAcceptedAt: Date       // 同意时间
  },

  // 追踪字段（防止并发扣费）
  lastDeductedAt: Date,           // 最后扣费时间
  lastDeductedTaskId: String,     // 最后扣费的任务 ID

  // 时间戳
  createdAt: Date,                // 账户创建时间
  updatedAt: Date,                // 最后更新时间
  lastActiveAt: Date              // 最后活跃时间
}
```

### 创建命令

```bash
# 创建 collection
cloudbase database:collection-create users -p

# 创建索引
cloudbase database:create-index users -k createdAt
cloudbase database:create-index users -k lastActiveAt -u false -o desc

# 设置云读写规则
# read: "doc._id == auth.uid"
# write: "doc._id == auth.uid"  (自己的数据自己写)
# create: false (禁止客户端创建，必须云函数创建)
```

### 示例数据

```json
{
  "_id": "openid_12345",
  "credits": 5,
  "freeCreditsGranted": true,
  "settings": {
    "historyEnabled": true,
    "privacyAccepted": true,
    "privacyAcceptedAt": "2025-12-23T10:00:00Z"
  },
  "lastDeductedAt": "2025-12-23T15:30:00Z",
  "lastDeductedTaskId": "task_abc123",
  "createdAt": "2025-12-23T08:00:00Z",
  "updatedAt": "2025-12-23T15:30:00Z",
  "lastActiveAt": "2025-12-23T16:00:00Z"
}
```

---

## 2. analysis_tasks Collection（分析任务表）

### 用途
存储用户的每次分析任务记录（包含 OCR、LLM、安全检测结果）。

### Schema 定义

```javascript
{
  // 主键与归属
  _id: String,                    // 任务 ID（自动生成）
  openid: String,                 // 所属用户的 OpenID

  // 任务状态
  status: String,                 // created | uploaded | ocr_done | llm_done |
                                  // deleted_assets | error

  // 用户输入参数
  relationType: String,           // 可空：恋爱场景 | 职场场景
                                  // 值: pursuing|ambiguous|dating|superior_subordinate
                                  //     |colleague|client_vendor
  goalType: String,               // 可空：用户目标类型
                                  // 值: no_cold_chat|push_relation|resolve_conflict
                                  //     |push_back_task|reject_unreasonable|etc

  // 图片信息
  image: {
    fileId: String,               // 云存储文件 ID
    uploadedAt: Date              // 上传时间
  },

  // OCR 结果
  ocr: {
    messages: [                   // 结构化消息数组
      {
        role: String,             // me | them | unknown
        text: String,             // 消息文本
        confidence: Number,       // OCR 置信度 (0-1)
        position: {
          x: Number,              // 消息 x 坐标
          y: Number               // 消息 y 坐标
        }
      }
    ],
    needRoleFix: Boolean,         // 是否需要角色校正
    confidence: Number,           // OCR 整体置信度 (0-1)
    rawResponse: Object           // 原始 OCR 响应（调试用）
  },

  // LLM 分析结果
  llm: {
    result: {
      profile_one_liner: String,  // 一句话心理侧写
      emotion: [                  // 情绪评分
        {
          label: String,          // 情绪维度（兴奋度、防御度等）
          score: Number           // 评分 (0-100)
        }
      ],
      intent: [                   // 意图推断
        {
          label: String,
          score: Number
        }
      ],
      strategy: [String],         // 策略建议数组
      replies: [                  // 3 条风格回复
        {
          style: String,          // 风格名称
          text: String,           // 回复文案
          note: String            // 适用场景说明
        }
      ],
      next_steps: [String],       // 下一步建议
      clarify_questions: [String] // 需要澄清的问题
    },
    deep_report: {                // 深度报告（可选，解锁后生成）
      emotionRadar: [
        {
          label: String,
          score: Number
        }
      ],
      implicitTexts: [
        {
          original: String,       // 原话
          implicit: String        // 潜台词
        }
      ],
      nextSteps: [String],
      avoidMistakes: [String],
      generatedAt: Date
    }
  },

  // 内容安全检测
  safety: {
    status: String,               // pass | fail | unverified
    suggest: String,              // block | review | (空表示通过)
    rewritten: Boolean,           // 是否已改写
    flaggedFields: [String],      // 触发的字段
    checkResult: Object,          // msgSecCheck 原始结果
    checkedAt: Date
  },

  // 费用信息
  cost: {
    creditsCharged: Number        // 扣费总数 (基础 1 + 深度报告 1 + 换一批 N)
  },

  // 错误信息（status=error 时）
  error: {
    code: String,                 // 错误代码
    message: String,              // 错误信息
    stage: String,                // 出错阶段 (ocr|llm|safety)
    details: Object               // 详细堆栈
  },

  // 时间戳
  createdAt: Date,                // 任务创建时间
  updatedAt: Date,                // 最后更新时间
  deletedAssetsAt: Date           // 资源删除时间（若有）
}
```

### 创建命令

```bash
# 创建 collection
cloudbase database:collection-create analysis_tasks -p

# 创建索引
cloudbase database:create-index analysis_tasks -k openid,createdAt -u false -o desc
cloudbase database:create-index analysis_tasks -k status
cloudbase database:create-index analysis_tasks -k _id
cloudbase database:create-index analysis_tasks -k 'llm.result.profile_one_liner'

# 设置云读写规则
# read: "doc.openid == auth.uid"
# write: "auth.uid != null"  (云函数可写)
# create: "auth.uid != null"
# update: "auth.uid != null && doc.openid == auth.uid"
```

### 示例数据

```json
{
  "_id": "task_abc123",
  "openid": "openid_12345",
  "status": "llm_done",
  "relationType": "ambiguous",
  "goalType": "push_relation",
  "image": {
    "fileId": "cloud://xxx/temp/task_abc123.jpg",
    "uploadedAt": "2025-12-23T15:00:00Z"
  },
  "ocr": {
    "messages": [
      {"role": "them", "text": "你在忙吗？", "confidence": 0.98},
      {"role": "me", "text": "有点忙，咋了？", "confidence": 0.95}
    ],
    "needRoleFix": false,
    "confidence": 0.96
  },
  "llm": {
    "result": {
      "profile_one_liner": "对你有好感但防御心强，需要更多主动信号",
      "emotion": [
        {"label": "兴奋度", "score": 45},
        {"label": "防御度", "score": 65}
      ],
      "strategy": ["不要主动认输", "保持神秘感", "给予期待感"],
      "replies": [...]
    }
  },
  "safety": {
    "status": "pass",
    "suggest": "",
    "rewritten": false,
    "checkedAt": "2025-12-23T15:10:00Z"
  },
  "cost": {
    "creditsCharged": 1
  },
  "createdAt": "2025-12-23T15:00:00Z",
  "updatedAt": "2025-12-23T15:10:00Z"
}
```

---

## 3. wallet_ledger Collection（钱包账本表）

### 用途
记录所有点数变动日志（支持审计与对账）。

### Schema 定义

```javascript
{
  // 主键
  _id: String,                    // 账本记录 ID（自动生成）

  // 用户信息
  openid: String,                 // 所属用户 OpenID

  // 交易信息
  type: String,                   // 交易类型
                                  // new_user_bonus（新手赠送）
                                  // analysis（分析扣费）
                                  // deep_report（深度报告）
                                  // refresh_replies（换一批回复）
                                  // purchase（购买点数）
                                  // refund（退款）

  delta: Number,                  // 变化数额（正数=增加，负数=减少）
  balanceAfter: Number,           // 操作后余额（用于快速查询）

  // 关联信息
  ref: {
    taskId: String,               // 可空：关联的任务 ID
    orderId: String,              // 可空：关联的订单 ID
    refundOf: String              // 可空：原交易 ID（退款时）
  },

  // 备注
  reason: String,                 // 交易原因/备注
  metadata: Object,               // 额外字段（灵活扩展）

  // 时间戳
  createdAt: Date                 // 交易时间（核心字段，用于排序）
}
```

### 创建命令

```bash
# 创建 collection
cloudbase database:collection-create wallet_ledger -p

# 创建索引（关键性能索引）
cloudbase database:create-index wallet_ledger -k openid,createdAt -u false -o desc
cloudbase database:create-index wallet_ledger -k 'ref.taskId'
cloudbase database:create-index wallet_ledger -k 'ref.orderId'
cloudbase database:create-index wallet_ledger -k type

# 设置云读写规则
# read: "doc.openid == auth.uid"  (用户只能看自己的)
# write: "false"  (禁止客户端写，只能云函数)
# create: "false"
# delete: "false"
```

### 示例数据

```json
[
  {
    "_id": "ledger_001",
    "openid": "openid_12345",
    "type": "new_user_bonus",
    "delta": 1,
    "balanceAfter": 1,
    "reason": "新用户赠送",
    "createdAt": "2025-12-23T08:00:00Z"
  },
  {
    "_id": "ledger_002",
    "openid": "openid_12345",
    "type": "analysis",
    "delta": -1,
    "balanceAfter": 0,
    "ref": {"taskId": "task_abc123"},
    "reason": "基础分析扣费",
    "createdAt": "2025-12-23T15:10:00Z"
  },
  {
    "_id": "ledger_003",
    "openid": "openid_12345",
    "type": "purchase",
    "delta": 5,
    "balanceAfter": 5,
    "ref": {"orderId": "order_xyz789"},
    "reason": "购买 5 点点数",
    "metadata": {"productId": "5points", "price": "2.99"},
    "createdAt": "2025-12-23T16:00:00Z"
  }
]
```

---

## 4. orders Collection（订单表）

### 用途
记录用户的点数购买订单（支持支付对账）。

### Schema 定义

```javascript
{
  // 主键
  _id: String,                    // 订单 ID（自动生成）

  // 订单信息
  orderNo: String,                // 订单号（唯一，用于支付回调对账）
  openid: String,                 // 所属用户 OpenID

  // 商品信息
  productId: String,              // 商品 ID：5points | 20points | ...
  amountFen: Number,              // 金额（分）：299 | 990 | ...
  creditsAdded: Number,           // 增加的点数

  // 支付信息
  status: String,                 // pending | paid | shipped | completed | cancelled
  paidAt: Date,                   // 支付完成时间

  // 微信支付原始数据
  wxPayData: {
    transactionId: String,        // 微信交易 ID
    prepayId: String,             // prepayId
    paymentSignature: String,      // 支付签名（验证用）
    mchId: String                 // 商户 ID
  },

  // 时间戳
  createdAt: Date,                // 订单创建时间
  updatedAt: Date                 // 最后更新时间
}
```

### 创建命令

```bash
# 创建 collection
cloudbase database:collection-create orders -p

# 创建索引
cloudbase database:create-index orders -k orderNo -u true  # 订单号唯一
cloudbase database:create-index orders -k openid,createdAt -u false -o desc
cloudbase database:create-index orders -k status
cloudbase database:create-index orders -k 'wxPayData.transactionId'

# 设置云读写规则
# read: "doc.openid == auth.uid"
# write: "false"
# create: "false"  (禁止客户端创建，只能云函数)
```

### 示例数据

```json
{
  "_id": "order_xyz789",
  "orderNo": "ORDER_20251223_001",
  "openid": "openid_12345",
  "productId": "5points",
  "amountFen": 299,
  "creditsAdded": 5,
  "status": "paid",
  "paidAt": "2025-12-23T16:05:00Z",
  "wxPayData": {
    "transactionId": "4200001234567890",
    "prepayId": "wx0123456789abcdef",
    "paymentSignature": "xxx",
    "mchId": "1900000109"
  },
  "createdAt": "2025-12-23T16:00:00Z",
  "updatedAt": "2025-12-23T16:05:00Z"
}
```

---

## 5. risk_logs Collection（风险日志表）

### 用途
记录所有安全、风控、异常事件（用于合规审计）。

### Schema 定义

```javascript
{
  // 主键
  _id: String,                    // 日志 ID（自动生成）

  // 用户与任务信息
  openid: String,                 // 涉及用户 OpenID
  taskId: String,                 // 可空：关联的任务 ID

  // 风险信息
  stage: String,                  // 发生阶段：ocr | llm | safety | payment | fraud
  reason: String,                 // 风险原因

  // 详细信息
  detail: {
    errorCode: String,
    errorMessage: String,
    content: String,              // 触发的内容（脱敏）
    metadata: Object              // 额外信息
  },

  // 处理信息
  action: String,                 // 处理方式：blocked | warning | logged | manual_review
  reviewedBy: String,             // 可空：审核人
  resolvedAt: Date,               // 可空：解决时间

  // 时间戳
  createdAt: Date                 // 日志时间
}
```

### 创建命令

```bash
# 创建 collection
cloudbase database:collection-create risk_logs -p

# 创建索引
cloudbase database:create-index risk_logs -k taskId
cloudbase database:create-index risk_logs -k openid,createdAt -u false -o desc
cloudbase database:create-index risk_logs -k stage
cloudbase database:create-index risk_logs -k reason

# 设置云读写规则
# read: "false"  (仅云函数可读，用户不可访问)
# write: "false"
# create: "false"
```

### 示例数据

```json
{
  "_id": "risk_log_001",
  "openid": "openid_12345",
  "taskId": "task_abc123",
  "stage": "safety",
  "reason": "msgSecCheck_blocked",
  "detail": {
    "errorCode": "87014",
    "errorMessage": "内容触发风控",
    "content": "[脱敏内容]",
    "flaggedFields": ["replies[0].text"]
  },
  "action": "blocked",
  "createdAt": "2025-12-23T15:15:00Z"
}
```

---

## 🔧 索引总结与性能优化

### 索引清单

| Collection | 索引字段 | 索引类型 | 说明 |
|-----------|---------|--------|------|
| users | createdAt | 升序 | 用户数量统计 |
| users | lastActiveAt | 降序 | 活跃用户查询 |
| analysis_tasks | (openid, createdAt) | 复合 | 用户历史记录查询（最常用） |
| analysis_tasks | status | 升序 | 按状态筛选 |
| wallet_ledger | (openid, createdAt) | 复合 | 账本查询（最常用） |
| wallet_ledger | ref.taskId | 升序 | 按任务查询相关费用 |
| orders | orderNo | 唯一 | 订单号对账 |
| risk_logs | taskId | 升序 | 风险日志查询 |
| risk_logs | (openid, createdAt) | 复合 | 用户风险统计 |

### 性能建议

1. **避免全表扫描**：所有查询都应利用索引
2. **复合索引顺序**：等值查询（openid）→ 排序字段（createdAt）
3. **分页查询**：使用 skip + limit，limit 不超过 100
4. **定期分析**：使用 CloudBase 控制台的"慢查询"功能

---

## 🔒 云读写权限规则

```json
{
  "users": {
    "read": "doc._id == auth.uid",
    "write": "doc._id == auth.uid",
    "create": false,
    "update": "doc._id == auth.uid && auth.uid != null",
    "delete": false
  },
  "analysis_tasks": {
    "read": "doc.openid == auth.uid",
    "write": "auth.uid != null && doc.openid == auth.uid",
    "create": "auth.uid != null",
    "update": "auth.uid != null && doc.openid == auth.uid",
    "delete": false
  },
  "wallet_ledger": {
    "read": "doc.openid == auth.uid",
    "write": false,
    "create": false,
    "update": false,
    "delete": false
  },
  "orders": {
    "read": "doc.openid == auth.uid",
    "write": false,
    "create": false,
    "update": false,
    "delete": false
  },
  "risk_logs": {
    "read": false,
    "write": false,
    "create": false,
    "update": false,
    "delete": false
  }
}
```

---

## 📊 数据库容量规划

假设首年日活 1000 人，人均 5 次分析：

| Collection | 记录数 | 存储空间 | 说明 |
|-----------|-------|---------|------|
| users | 100K | 50 MB | 新用户数：100k |
| analysis_tasks | 1.8M | 1.8 GB | 日活 1000 × 5 × 365 |
| wallet_ledger | 5M | 500 MB | 每次分析生成 ~3 条账本 |
| orders | 10K | 10 MB | 转化率 1% |
| risk_logs | 100K | 100 MB | 违规率 5% |
| **合计** | **7M** | **~2.5 GB** | - |

**建议**：初期预留 10GB 空间，监控增长速度。

