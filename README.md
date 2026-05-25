# 问题漂流瓶

一个极简匿名文字互动网站：访客可以匿名留下一个问题，后来的访客可以匿名回答一个随机问题。提问者保存私人链接，之后用它回来查看回复。

第一版刻意保持简单：没有账号、没有姓名、没有点赞、没有通知、没有评论串，也没有 AI 功能。

## 功能

- 留下问题：生成随机私人 token，并把 token 的哈希存进数据库。
- 回答陌生人：随机抽取一个未满回复数的问题。
- 查看回复：输入私人链接或 token 后查看对应问题的回复。
- 中文、移动端友好、静态网页。
- 基础长度限制和占位式广告/骚扰词过滤。

## 隐私说明

这是“社交意义上的匿名”，不是“加密匿名”。

- 网站不要求登录。
- 网站不收集姓名、邮箱或手机号。
- 页面不会展示作者身份。
- 私人 token 只在浏览器里显示；数据库保存的是 token 的 SHA-256 哈希。
- Supabase、托管平台、CDN 或网络服务商仍可能保留访问日志、IP、User-Agent 等技术记录。
- 请不要提交敏感个人信息、真实身份线索或会伤害自己的内容。

## 文件结构

```text
.
├── index.html
├── styles.css
├── app.js
├── config.js
├── supabase-schema.sql
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
window.BOTTLE_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR-SUPABASE-ANON-KEY",
  maxAnswersPerQuestion: 5
};
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

这个项目已经包含 `vercel.json` 和 `api/config.js`。为了避免把本地配置提交到 GitHub，`config.js` 会被 `.gitignore` 忽略。

在 Vercel 项目设置里添加两个 Environment Variables：

```text
SUPABASE_URL=https://YOUR-PROJECT.supabase.co/rest/v1/
SUPABASE_ANON_KEY=YOUR-SUPABASE-ANON-KEY
```

本地开发时，可以复制 `config.example.js` 为 `config.js`，再填入自己的 Supabase 配置。

## 数据库设计

`questions`

- `id`：内部 UUID，不在前端展示。
- `public_id`：公开随机 ID，用于回答时关联问题。
- `question_text`：问题正文。
- `claim_token_hash`：私人 token 的哈希。
- `created_at`：创建时间。

`answers`

- `id`：内部 UUID。
- `question_id`：关联问题。
- `answer_text`：回答正文。
- `created_at`：创建时间。

前端只调用 Supabase RPC 函数：

- `submit_question`
- `get_random_question`
- `submit_answer`
- `get_replies_by_token`

匿名用户没有直接读取表的权限。

## TODO

- 增加真正的速率限制，例如 Cloudflare Turnstile、Supabase Edge Function 或托管平台中间件。
- 增加更可靠的内容审核和举报机制。
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
