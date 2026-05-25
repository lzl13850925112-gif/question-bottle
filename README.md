# 夜间匿名信号

一个轻量匿名文字互动网站：访客可以写公开匿名短留言、匿名回复留言，也可以继续使用原来的问题漂流瓶。提问者保存私人链接，之后用它回来查看漂流瓶回复。

项目刻意保持简单：没有账号、没有姓名、没有排行、没有通知，也没有 AI 功能。

## 功能

- 留下问题：生成随机私人 token，并把 token 的哈希存进数据库。
- 回答陌生人：随机抽取一个未满回复数、最近没看过的问题。
- 查看回复：输入私人链接或 token 后查看对应问题的回复。
- 公共留言板：发布公开匿名短留言。
- 匿名回声：对公开留言进行匿名回复。
- 我的内容：用浏览器本地匿名 token 管理这个浏览器发过的问题和公开留言。
- 轻量点赞：公开留言可以喜欢一次；提问者可以喜欢收到的回答。
- 提问者补充回复：提问者查看回复后，可以给每条回答发送一句短回复。
- 双方同意公开：提问者和回答者都勾选同意时，匿名问答会自动出现在公共留言板。
- 中文、移动端友好、静态网页。
- 基础长度限制和占位式广告/骚扰词过滤。

## 隐私说明

这是“社交意义上的匿名”，不是“加密匿名”。

- 网站不要求登录。
- 网站不收集姓名、邮箱或手机号。
- 页面不会展示作者身份。
- 前端会在浏览器 `localStorage` 里保存一个随机 visitor token，用它判断“我的内容”和防止重复点赞。
- 数据库只保存 visitor token 的 SHA-256 哈希，不保存原始 visitor token。
- 私人 token 只在浏览器里显示；数据库保存的是 token 的 SHA-256 哈希。
- 漂流瓶问答只有在提问者和回答者都同意时，才会作为匿名内容出现在公共留言板。
- Supabase、托管平台、CDN 或网络服务商仍可能保留访问日志、IP、User-Agent 等技术记录。
- 请不要提交敏感个人信息、真实身份线索或会伤害自己的内容。

## 文件结构

```text
.
├── index.html
├── styles.css
├── app.js
├── config.js
├── api/config.js
├── supabase-schema.sql
├── vercel.json
└── README.md
```

## Supabase 设置

1. 打开 [Supabase](https://supabase.com/) 并创建一个新项目。
2. 进入项目的 SQL Editor。
3. 复制 `supabase-schema.sql` 的全部内容并运行。
4. 进入 Project Settings → API。
5. 复制 Project URL 和 anon public key。
6. 打开 `config.js`，替换：

```js
window.SUPABASE_URL = "https://YOUR-PROJECT.supabase.co/rest/v1/";
window.SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-KEY";
```

anon public key 可以放在前端。真正需要保密的是 service role key，不要把 service role key 放进这个项目。

## 本地运行

这个项目不需要构建工具。任选一种方式启动本地静态服务：

```bash
python3 -m http.server 5173
```

然后打开：

```text
http://localhost:5173
```

也可以用 VS Code 的 Live Server，或任何静态文件服务器。

## 部署建议

适合部署到常见静态托管平台：

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

部署时只需要上传这些静态文件。Supabase 作为后端和数据库。

如果希望在常见 VPN/互联网环境里更稳定，优先选择访问质量较好的静态托管平台，并让 Supabase 项目区域尽量靠近主要用户所在地。

### Vercel 部署

这个项目包含 `vercel.json` 和 `api/config.js`，也可以直接提交 `config.js` 中的 Supabase publishable key。不要提交 service role key 或任何 `sb_secret` key。

在 Vercel 项目设置里添加两个 Environment Variables：

```text
SUPABASE_URL=https://YOUR-PROJECT.supabase.co/rest/v1/
SUPABASE_ANON_KEY=YOUR-SUPABASE-ANON-KEY
```

本地开发时，可以复制 `config.example.js` 为 `config.js`，再填入自己的 Supabase 配置。

## 数据库迁移

如果你已经运行过旧版 schema，不需要删库。直接在 Supabase SQL Editor 重新运行最新版 `supabase-schema.sql`。

本次升级会新增：

- `questions.owner_token_hash`：这个浏览器发出的问题所有权哈希。
- `questions.edited_at`：问题编辑时间。只有没有回答的问题可以编辑。
- `answers.public_id`：回答的随机公开 ID，用于提问者反馈。
- `answers.owner_token_hash`：这个浏览器发出的回答所有权哈希。
- `public_messages.owner_token_hash`：公开留言所有权哈希。
- `public_messages.edited_at`：公开留言编辑时间。
- `public_message_likes`：公开留言点赞记录；同一个 visitor token 只能点一次。
- `answer_feedback`：提问者对回答的喜欢和一句短回复。
- `questions.allow_public`：提问者是否愿意在双方同意时公开这组匿名问答。
- `answers.allow_public`：回答者是否愿意在双方同意时公开这组匿名问答。
- `public_messages.message_kind`：区分普通留言和漂流瓶公开问答。
- `public_messages.source_answer_id`：记录公开问答来自哪条匿名回答，避免重复发布。

本次升级会新增或更新这些 RPC：

- `submit_question`：提交问题，同时保存可选 `owner_token_hash`。
- `get_random_question`：排除最近看过的问题，并优先抽回复较少的问题。
- `submit_answer`：提交回答，同时保存可选 `owner_token_hash`，双方同意时自动公开问答。
- `get_replies_by_token`：读取问题回复，并返回提问者是否已喜欢、是否已补充回复。
- `submit_public_message`：提交公开留言，同时保存可选 `owner_token_hash`。
- `get_public_messages`：读取公开留言、回复数、点赞数、当前浏览器是否点过赞。
- `submit_public_message_reply`：回复公开留言。
- `get_public_message_replies`：读取某条公开留言的回复。
- `like_public_message`：当前浏览器 visitor token 喜欢公开留言。
- `update_public_message` / `delete_public_message`：公开留言所有者编辑或删除。
- `get_my_content`：读取当前浏览器发过的问题、回答和公开留言。
- `update_my_question` / `delete_my_question`：问题所有者编辑或删除；已收到回答的问题不能编辑。
- `like_answer_by_asker`：提问者喜欢一条回答。
- `send_asker_reply`：提问者给一条回答发送一句短回复，只能发送一次。

前端会把最近看过的问题 `public_id` 存在 `localStorage`，抽题时排除这些问题，并优先抽回复较少的问题。前端还会保存一个本地 visitor token；数据库只保存它的哈希，用来实现“我的内容”和去重点赞。这不是账号系统，换浏览器、换设备或清除浏览器数据后不会自动同步。

### 迁移后要做

1. 在 Supabase SQL Editor 运行最新版 `supabase-schema.sql`。
2. 确认 Vercel 使用最新代码重新部署。
3. 如果之前浏览器缓存较重，可以刷新页面后再测试。

## 数据库设计

`questions`

- `id`：内部 UUID，不在前端展示。
- `public_id`：公开随机 ID，用于回答时关联问题。
- `question_text`：问题正文。
- `claim_token_hash`：私人 token 的哈希。
- `owner_token_hash`：浏览器本地 visitor token 的哈希，用于“我的内容”。
- `allow_public`：提问者是否同意双方同意后公开匿名问答。
- `edited_at`：问题被编辑的时间。
- `created_at`：创建时间。

`answers`

- `id`：内部 UUID。
- `public_id`：公开随机 ID，用于提问者反馈。
- `question_id`：关联问题。
- `answer_text`：回答正文。
- `owner_token_hash`：浏览器本地 visitor token 的哈希，用于“我的回答”。
- `allow_public`：回答者是否同意双方同意后公开匿名问答。
- `created_at`：创建时间。

`public_messages`

- `id`：内部 UUID。
- `public_id`：公开随机 ID。
- `message_kind`：`message` 或 `bottle_qa`。
- `message_text`：公开留言正文；公开问答会以“问 / 答”形式保存。
- `owner_token_hash`：浏览器本地 visitor token 的哈希，用于公开留言编辑和删除。
- `source_answer_id`：公开问答来源回答，用于避免重复。
- `edited_at`：公开留言被编辑的时间。
- `created_at`：创建时间。

`public_message_replies`

- `id`：内部 UUID。
- `message_id`：关联公开留言。
- `reply_text`：匿名回复正文。
- `created_at`：创建时间。

`public_message_likes`

- `id`：内部 UUID。
- `message_id`：关联公开留言。
- `owner_token_hash`：点赞者的浏览器本地 visitor token 哈希。
- `created_at`：创建时间。

`answer_feedback`

- `answer_id`：关联回答。
- `asker_liked`：提问者是否喜欢这条回答。
- `asker_reply_text`：提问者给回答者的一句短回复。
- `created_at` / `updated_at`：创建和更新时间。

前端只调用 Supabase RPC 函数：

- `submit_question`
- `get_random_question`
- `submit_answer`
- `get_replies_by_token`
- `submit_public_message`
- `get_public_messages`
- `submit_public_message_reply`
- `get_public_message_replies`
- `like_public_message`
- `update_public_message`
- `delete_public_message`
- `get_my_content`
- `update_my_question`
- `delete_my_question`
- `like_answer_by_asker`
- `send_asker_reply`

匿名用户没有直接读取表的权限。

## TODO

- 增加真正的速率限制，例如 Cloudflare Turnstile、Supabase Edge Function 或托管平台中间件。
- 增加更可靠的内容审核和举报机制。
- 增加公开留言举报/隐藏机制。
- 为问题设置过期时间或定期清理策略。
- 让每个问题的最大回复数变成可配置项；当前数据库层硬上限是 10 条。
- 增加简单管理后台，但不要引入公开身份系统。
- 增加备份和删除策略。
- 上线前补充服务条款和更完整的隐私说明。

## 修改入口

- 改文字：`index.html`
- 改样式：`styles.css`
- 改交互逻辑：`app.js`
- 改数据库：`supabase-schema.sql`
