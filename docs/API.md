# ChatWiz 云函数 API 文档

> 所有云函数均启用身份验证，调用者需通过 `wx.cloud.callFunction` 且已授权。

---

## 请求/响应格式

### 统一响应格式

所有云函数返回统一的 JSON 结构：

```javascript
{
  code: 0 | "ERROR_CODE",      // 0 表示成功，其他值表示错误码
  message: "success" | "error message",
  data: any,                    // 成功时返回数据，失败时可为空
  timestamp: "2025-12-23T15:00:00Z",
  requestId: "req_xxx"         // 用于调试与追踪
}
```

### 错误码定义

| 错误码 | 说明 | HTTP 状态 |
|-------|------|---------|
| 0 | 成功 | 200 |
| UNAUTHORIZED | 未授权 | 401 |
| INSUFFICIENT_CREDITS | 点数不足 | 402 |
| OCR_FAILED | OCR 识别失败 | 400 |
| LLM_FAILED | LLM 分析失败 | 500 |
| MSGCHECK_FAILED | 内容安全检测失败 | 400 |
| DATABASE_ERROR | 数据库错误 | 500 |
| INVALID_PARAMS | 参数格式错误 | 400 |
| NOT_FOUND | 资源不存在 | 404 |
| RATE_LIMITED | 请求过于频繁 | 429 |

---

## 1. authEnsureUser

**功能**：用户认证与初始化
**调用时机**：App 首次启动时
**消耗点数**：否
**身份验证**：是（云函数自动获取 OpenID）

### 请求

```javascript
wx.cloud.callFunction({
  name: 'authEnsureUser',
  success: (res) => {
    console.log(res.result);
  }
})
```

### 请求参数

无（OpenID 由云函数自动获取）

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "openid": "openid_12345",
    "credits": 1,
    "settings": {
      "historyEnabled": true,
      "privacyAccepted": false
    }
  }
}
```

### 返回字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| openid | String | 用户唯一标识 |
| credits | Number | 当前可用点数 |
| settings.historyEnabled | Boolean | 历史记录是否启用 |
| settings.privacyAccepted | Boolean | 是否同意隐私政策 |

### 业务逻辑

1. 获取调用者 OpenID
2. 查询数据库是否存在该用户
3. 若不存在，创建新用户 + 赠送 1 点 + 记录账本
4. 若存在，更新 lastActiveAt
5. 返回用户信息

### 错误处理

```javascript
// 未授权
{
  "code": "UNAUTHORIZED",
  "message": "未授权的请求"
}

// 数据库错误
{
  "code": "DATABASE_ERROR",
  "message": "服务器错误"
}
```

---

## 2. createTask

**功能**：创建分析任务
**调用时机**：用户点击"让军师看看"前
**消耗点数**：否（仅预留）
**身份验证**：是

### 请求

```javascript
wx.cloud.callFunction({
  name: 'createTask',
  data: {
    relationType: 'ambiguous',     // 可选
    goalType: 'push_relation'      // 可选
  },
  success: (res) => {
    const taskId = res.result.data.taskId;
  }
})
```

### 请求参数

| 参数 | 类型 | 必须 | 说明 |
|------|------|------|------|
| relationType | String | 否 | 关系类型 |
| goalType | String | 否 | 目标类型 |

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_abc123",
    "status": "created",
    "createdAt": "2025-12-23T15:00:00Z"
  }
}
```

---

## 3. bindUpload

**功能**：绑定上传的图片到任务
**调用时机**：图片上传完成后
**消耗点数**：否
**身份验证**：是

### 请求

```javascript
// 第一步：上传图片到云存储
wx.cloud.uploadFile({
  cloudPath: `temp/${taskId}.jpg`,
  filePath: filePath,  // wx.chooseMedia 返回的路径
  success: (res) => {
    const fileId = res.fileID;

    // 第二步：绑定 fileId 到 task
    wx.cloud.callFunction({
      name: 'bindUpload',
      data: {
        taskId: 'task_abc123',
        fileId: fileId
      }
    });
  }
});
```

### 请求参数

| 参数 | 类型 | 必须 | 说明 |
|------|------|------|------|
| taskId | String | 是 | 任务 ID（createTask 返回） |
| fileId | String | 是 | 云存储文件 ID |

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_abc123",
    "status": "uploaded",
    "uploadedAt": "2025-12-23T15:01:00Z"
  }
}
```

---

## 4. runOCR

**功能**：执行 OCR 识别
**调用时机**：bindUpload 成功后
**消耗点数**：否
**身份验证**：是

### 请求

```javascript
wx.cloud.callFunction({
  name: 'runOCR',
  data: {
    taskId: 'task_abc123'
  },
  success: (res) => {
    console.log(res.result.data);
  }
})
```

### 请求参数

| 参数 | 类型 | 必须 | 说明 |
|------|------|------|------|
| taskId | String | 是 | 任务 ID |

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "messages": [
      {"role": "them", "text": "你在忙吗？", "confidence": 0.98},
      {"role": "me", "text": "有点忙，咋了？", "confidence": 0.95}
    ],
    "needRoleFix": false,
    "confidence": 0.96
  }
}
```

### 返回字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| messages | Array | 识别出的消息数组 |
| messages[].role | String | 角色（me / them / unknown） |
| messages[].text | String | 消息文本 |
| messages[].confidence | Number | 识别置信度 (0-1) |
| needRoleFix | Boolean | 是否需要用户校正角色 |
| confidence | Number | 整体识别置信度 (0-1) |

### 业务逻辑

1. 获取 task 中的 fileId
2. 调用微信服务市场 OCR
3. 后处理：按 y 坐标排序、按 x 坐标判断角色、过滤系统提示
4. 判断是否需要 needRoleFix
5. 返回 messages，前端判断是否跳转角色校正页

---

## 5. fixRoles

**功能**：修正消息角色（我/对方互换）
**调用时机**：用户在角色校正页操作后
**消耗点数**：否
**身份验证**：是

### 请求

```javascript
wx.cloud.callFunction({
  name: 'fixRoles',
  data: {
    taskId: 'task_abc123',
    action: 'swap'  // swap | keep
  }
})
```

### 请求参数

| 参数 | 类型 | 必须 | 说明 |
|------|------|------|------|
| taskId | String | 是 | 任务 ID |
| action | String | 是 | 操作：swap（对调）或 keep（保持）|

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "messages": [
      {"role": "me", "text": "你在忙吗？"},
      {"role": "them", "text": "有点忙，咋了？"}
    ]
  }
}
```

---

## 6. runLLM

**功能**：调用 DeepSeek 进行分析
**调用时机**：分析页，fixRoles 或 runOCR 之后
**消耗点数**：是（-1点）
**身份验证**：是

### 请求

```javascript
wx.cloud.callFunction({
  name: 'runLLM',
  data: {
    taskId: 'task_abc123',
    relationType: 'ambiguous',      // 可选
    goalType: 'push_relation'       // 可选
  },
  success: (res) => {
    const { profile_one_liner, replies } = res.result.data;
  },
  fail: (err) => {
    if (err.errMsg.includes('INSUFFICIENT_CREDITS')) {
      // 点数不足
    }
  }
})
```

### 请求参数

| 参数 | 类型 | 必须 | 说明 |
|------|------|------|------|
| taskId | String | 是 | 任务 ID |
| relationType | String | 否 | 关系类型 |
| goalType | String | 否 | 目标类型 |

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "profile_one_liner": "对你有好感但防御心强，需要更多主动信号",
    "emotion": [
      {"label": "兴奋度", "score": 45},
      {"label": "防御度", "score": 65}
    ],
    "intent": [
      {"label": "试探", "score": 70}
    ],
    "strategy": [
      "不要主动认输",
      "保持神秘感",
      "给予期待感"
    ],
    "replies": [
      {
        "style": "高冷推拉型",
        "text": "忙完再聊，先把手上的事做完",
        "note": "保持矜持，给对方期待感"
      },
      {
        "style": "幽默调侃型",
        "text": "这么关心我？让我有点不好意思呢😏",
        "note": "打破尴尬，增进亲密"
      },
      {
        "style": "真诚直球型",
        "text": "有点忙，不过等我，我们晚上聊？",
        "note": "表达真实，给予安全感"
      }
    ],
    "next_steps": [
      "今晚准时回复，显示你在认真对待这段关系",
      "避免过度解释，留下神秘感",
      "下次对方主动示好时，要有所回应"
    ]
  }
}
```

### 失败响应

```json
{
  "code": "INSUFFICIENT_CREDITS",
  "message": "点数不足，请购买"
}
```

---

## 7. cleanupTaskAssets

**功能**：删除任务关联的云存储文件
**调用时机**：结果展示完成后 / 用户主动删除
**消耗点数**：否
**身份验证**：是

### 请求

```javascript
wx.cloud.callFunction({
  name: 'cleanupTaskAssets',
  data: {
    taskId: 'task_abc123'
  }
})
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_abc123",
    "deleted": true,
    "deletedAt": "2025-12-23T15:15:00Z"
  }
}
```

---

## 8. msgSecCheck

**功能**：内容安全检测（云函数内部调用）
**调用时机**：runLLM 生成结果后自动调用
**消耗点数**：否
**身份验证**：是（仅云函数内部调用）

### 内部请求（由 runLLM 调用）

```javascript
// 在 runLLM 中自动调用
const checkResult = await cloud.callFunction({
  name: 'msgSecCheck',
  data: {
    content: '需要检测的文本...'
  }
});
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "pass",
    "suggest": ""
  }
}
```

或（命中风控）

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "fail",
    "suggest": "block"
  }
}
```

---

## 9. 其他云函数（v1.1+）

### queryBalance
查询用户点数余额

### getAnalysisHistory
获取用户分析历史

### deleteTask
删除任务记录

### createPayOrder
创建支付订单

### (更多函数待补充)

---

## 🔐 安全注意事项

1. **身份验证**：所有涉及用户数据的函数都需要验证 OpenID
2. **点数检查**：扣费前必须检查用户余额
3. **幂等性**：扣费操作需支持重试不重复扣费
4. **速率限制**：防止频繁调用（建议 1s 内最多 1 次分析）
5. **日志记录**：记录所有错误与异常，便于调试

---

## 📝 调试建议

### 本地测试
```javascript
// 在微信开发者工具中测试
const testTask = async () => {
  const res = await wx.cloud.callFunction({
    name: 'authEnsureUser'
  });
  console.log('User:', res.result);
};
testTask();
```

### 使用 Mock 数据
在开发环境可配置 `MOCK_LLM=true` 使用 mock 返回，加快开发速度。

### 查看云函数日志
```bash
cloudbase functions:logs authEnsureUser --limit 50
```

---

## 📚 相关文档

- [数据库 Schema](cloud/database/schema.md)
- [LLM Prompt](PROMPT.md)
- [架构设计](ARCHITECTURE.md)

