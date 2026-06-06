# 云开发部署指南（传记生成）

## 1. 环境

- 云环境 ID：`cloud1-d6g7w5pav096b922a`（已在 `miniprogram/app.js` 配置）
- 模型：DeepSeek API `deepseek-chat`（V3）

## 2. 云函数

| 云函数 | 说明 |
|--------|------|
| `generateBiography` | 传记生成（含素材摘要、内容安全、速率限制） |
| `chatInterview` | AI 访谈对话 |

公共模块源码位于 `cloudfunctions/common/`。**微信上传云函数时不会带上兄弟目录**，因此各云函数目录内各有 `common/` 副本（通过 `require('./common/...')` 引用）。

修改 `cloudfunctions/common/` 后，请先执行同步再部署：

```powershell
cd cloudfunctions
.\sync-common.ps1
```

然后重新「上传并部署」`generateBiography` 与 `chatInterview`。

## 3. 环境变量（云控制台配置，勿写入代码仓库）

在云开发控制台 → 云函数 → 对应函数 → **环境变量** 中添加：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | 是 | DeepSeek API Key |
| `PII_ENCRYPTION_KEY` | 建议 | 审计日志加密密钥（32 位以上随机字符串） |
| `ENABLE_PII_AUDIT` | 否 | 设为 `true` 时写入加密审计日志（默认关闭） |

> **安全提示**：API Key 仅保存在云函数环境变量中，不要提交到 Git，不要写在小程序前端。若 Key 曾泄露，请立即在 DeepSeek 控制台轮换。

## 4. 数据库集合

在云开发控制台创建以下集合（权限建议：仅云函数可写）：

- `bio_rate_limit`：接口速率限制计数
- `bio_audit_log`（可选）：加密审计日志，`ENABLE_PII_AUDIT=true` 时使用

## 5. 部署步骤

1. 用微信开发者工具打开本项目（根目录含 `project.config.json`）
2. 在 `cloudfunctions/generateBiography` 目录右键 → **在终端中打开** → 执行 `npm install`
3. 在 `cloudfunctions/chatInterview` 目录同样执行 `npm install`
4. （若刚改过 `cloudfunctions/common/`）在 `cloudfunctions` 目录执行 `.\sync-common.ps1`
5. 右键 `cloudfunctions/generateBiography` → **上传并部署：云端安装依赖**
6. 右键 `cloudfunctions/chatInterview` → **上传并部署：云端安装依赖**
7. **配置云函数超时（重要）**：云平台上限一般为 **60 秒**。请将 `generateBiography` 与 `chatInterview` 超时均设为 **60 秒**（默认 3 秒会报 `-504003`）。传记生成已优化为**单次 API 调用**，以适配 60 秒限制。
8. 在云控制台为两个函数配置 `DEEPSEEK_API_KEY` 等环境变量
9. 小程序端重新编译，走任一生成入口测试

## 6. 速率限制（默认）

| 接口 | 每小时 | 每天 |
|------|--------|------|
| 传记生成 | 15 次 | 60 次 |
| AI 访谈 | 80 次 | 300 次 |

可在 `cloudfunctions/common/constants.js` 中调整 `RATE_LIMITS`。

## 7. 生成流程

1. 小程序调用 `wx.cloud.callFunction({ name: 'generateBiography', data: { source, data, style, length } })`
2. 云函数校验 OpenID、速率、输入内容安全
3. 素材过长时在云函数内做**本地优先截取**（不再二次调用 API），保证 60 秒内完成
4. 输出经内容安全过滤后返回小程序
5. 前端以打字机效果展示正文

## 8. 合规说明

- 传输：微信云开发 HTTPS 通道
- 存储：用户传记默认仅存小程序本地；云侧仅可选写入加密审计摘要（哈希 + AES-GCM）
- 内容安全：输入/输出双层关键词与模式过滤
- 请勿在素材中提交完整身份证号、银行卡号等敏感信息
