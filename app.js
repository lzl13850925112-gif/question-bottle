let config = window.BOTTLE_CONFIG || {};

const state = {
  currentQuestion: null,
  client: null,
  publicMessages: [],
  visitorToken: "",
  ownerTokenHash: "",
  currentClaimTokenHash: ""
};

const RECENT_QUESTIONS_KEY = "questionBottle.recentQuestionIds";
const VISITOR_TOKEN_KEY = "questionBottle.visitorToken";
const MAX_RECENT_QUESTIONS = 12;

const blockedTerms = [
  "spam.example",
  "加微信",
  "博彩",
  "裸聊",
  "贷款"
];

const statusEl = document.querySelector("#status");
const views = [...document.querySelectorAll(".panel")];
const viewButtons = [...document.querySelectorAll("[data-view]")];

const publicMessageForm = document.querySelector("#public-message-form");
const publicMessageText = document.querySelector("#public-message-text");
const publicMessageList = document.querySelector("#public-message-list");
const refreshMessagesButton = document.querySelector("#refresh-messages");

const questionForm = document.querySelector("#question-form");
const questionText = document.querySelector("#question-text");
const questionPublicConsent = document.querySelector("#question-public-consent");
const claimResult = document.querySelector("#claim-result");
const claimLink = document.querySelector("#claim-link");
const copyClaimLink = document.querySelector("#copy-claim-link");

const loadQuestionButton = document.querySelector("#load-question");
const skipQuestionButton = document.querySelector("#skip-question");
const randomQuestionCard = document.querySelector("#random-question-card");
const answerForm = document.querySelector("#answer-form");
const answerText = document.querySelector("#answer-text");
const answerPublicConsent = document.querySelector("#answer-public-consent");

const checkForm = document.querySelector("#check-form");
const claimToken = document.querySelector("#claim-token");
const replyList = document.querySelector("#reply-list");
const myContent = document.querySelector("#my-content");

init();

async function init() {
  bindNavigation();
  bindCounters();
  bindForms();
  openTokenFromUrl();
  await loadConfig();

  if (!window.supabase || !isConfigured()) {
    setStatus("请先配置 Supabase 项目地址和 anon public key。", true);
    return;
  }

  if (!crypto?.subtle) {
    setStatus("当前页面需要 HTTPS 或 localhost，才能安全生成私人 token。", true);
    return;
  }

  state.visitorToken = getVisitorToken();
  state.ownerTokenHash = await sha256(state.visitorToken);
  state.client = window.supabase.createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );
  await loadPublicMessages();
}

async function loadConfig() {
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    config = {
      ...config,
      supabaseUrl: toSupabaseProjectUrl(window.SUPABASE_URL),
      supabaseAnonKey: window.SUPABASE_ANON_KEY,
      maxAnswersPerQuestion: config.maxAnswersPerQuestion || 5
    };
    window.BOTTLE_CONFIG = config;
  }

  if (isConfigured()) return;

  try {
    const response = await fetch("/api/config", {
      headers: { accept: "application/json" }
    });
    if (!response.ok) return;

    const runtimeConfig = await response.json();
    config = {
      ...config,
      ...runtimeConfig
    };
    window.BOTTLE_CONFIG = config;
  } catch {
    // Local static development can use config.js instead.
  }
}

function toSupabaseProjectUrl(url) {
  return url.replace(/\/rest\/v1\/?$/, "");
}

function isConfigured() {
  return (
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    !config.supabaseUrl.includes("YOUR-PROJECT") &&
    !config.supabaseAnonKey.includes("YOUR-SUPABASE")
  );
}

function bindNavigation() {
  viewButtons.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  showView("board");
}

function showView(id) {
  views.forEach((view) => view.classList.toggle("is-active", view.id === id));
  viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === id);
  });
  setStatus("");
  if (id === "mine" && state.client) loadMyContent();
}

function bindCounters() {
  document.querySelectorAll("[data-counter-for]").forEach((counter) => {
    const input = document.querySelector(`#${counter.dataset.counterFor}`);
    const render = () => {
      counter.textContent = `${input.value.length} / ${input.maxLength}`;
    };
    input.addEventListener("input", render);
    render();
  });
}

function bindForms() {
  publicMessageForm.addEventListener("submit", submitPublicMessage);
  refreshMessagesButton.addEventListener("click", loadPublicMessages);
  publicMessageList.addEventListener("click", handlePublicMessageClick);
  publicMessageList.addEventListener("submit", submitPublicReply);
  replyList.addEventListener("click", handleReplyListClick);
  replyList.addEventListener("submit", submitAskerReply);
  myContent.addEventListener("click", handleMyContentClick);
  questionForm.addEventListener("submit", submitQuestion);
  loadQuestionButton.addEventListener("click", loadRandomQuestion);
  skipQuestionButton.addEventListener("click", loadRandomQuestion);
  answerForm.addEventListener("submit", submitAnswer);
  checkForm.addEventListener("submit", checkReplies);
  copyClaimLink.addEventListener("click", copyClaim);
}

function openTokenFromUrl() {
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) return;

  claimToken.value = token;
  showView("check");
}

async function submitPublicMessage(event) {
  event.preventDefault();
  if (!state.client) return setStatus("Supabase 尚未配置。", true);

  const text = normalizeText(publicMessageText.value);
  const validation = validateText(text, 2, 280);
  if (!validation.ok) return setStatus(validation.message, true);

  await withBusy(publicMessageForm, async () => {
    const { error } = await state.client.rpc("submit_public_message", {
      message_body: text,
      owner_token_hash_value: state.ownerTokenHash
    });

    if (error) throw error;
    publicMessageForm.reset();
    updateAllCounters();
    setStatus("留言已发布。");
    await loadPublicMessages();
  });
}

async function loadPublicMessages() {
  if (!state.client) return;

  await withBusy(refreshMessagesButton, async () => {
    const { data, error } = await state.client.rpc("get_public_messages", {
      limit_count: 30,
      owner_token_hash_value: state.ownerTokenHash
    });

    if (error) throw error;
    state.publicMessages = data || [];
    renderPublicMessages(state.publicMessages);
    if (!state.publicMessages.length) setStatus("暂无公开留言。");
  });
}

function renderPublicMessages(messages) {
  if (!messages.length) {
    publicMessageList.innerHTML =
      '<article class="empty-state">还没有留言。你可以先发一条。</article>';
    return;
  }

  publicMessageList.innerHTML = messages
    .map(
      (message) => `
        <article class="message-card" data-message-id="${escapeHtml(message.public_id)}">
          <p class="message-meta">${formatDate(message.created_at)} · ${Number(message.reply_count || 0)} 条回复 · ${Number(message.like_count || 0)} 个喜欢</p>
          ${message.edited_at ? `<p class="message-meta">已于 ${formatDate(message.edited_at)} 编辑过</p>` : ""}
          ${message.message_kind === "bottle_qa" ? '<p class="message-meta">公开问答</p>' : ""}
          <p class="message-body">${escapeHtml(message.message_text)}</p>
          <div class="message-actions">
            <button class="secondary mini-button" data-action="like-message" type="button">${message.liked_by_me ? "已喜欢" : "喜欢"}</button>
            <button class="secondary" data-action="toggle-replies" type="button">展开回复</button>
            ${message.owned_by_me ? '<button class="secondary mini-button" data-action="edit-message" type="button">编辑</button><button class="secondary mini-button danger-button" data-action="delete-message" type="button">删除</button>' : ""}
          </div>
          <div class="inline-replies" hidden></div>
          <form class="reply-form" hidden>
            <label for="reply-${escapeHtml(message.public_id)}">匿名回复</label>
            <textarea id="reply-${escapeHtml(message.public_id)}" maxlength="500" placeholder="写一句回复。" required></textarea>
            <div class="form-row">
              <span class="small">最多 500 字</span>
              <button type="submit">发送回复</button>
            </div>
          </form>
        </article>
      `
    )
    .join("");
}

async function handlePublicMessageClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const card = button.closest("[data-message-id]");
  const messageId = card.dataset.messageId;

  if (button.dataset.action === "toggle-replies") {
    const replies = card.querySelector(".inline-replies");
    const form = card.querySelector(".reply-form");
    const shouldOpen = replies.hidden;

    replies.hidden = !shouldOpen;
    form.hidden = !shouldOpen;
    button.textContent = shouldOpen ? "收起回复" : "展开回复";

    if (shouldOpen) await loadPublicReplies(messageId, replies);
  }

  if (button.dataset.action === "like-message") {
    await likePublicMessage(messageId);
  }

  if (button.dataset.action === "edit-message") {
    await editPublicMessage(messageId);
  }

  if (button.dataset.action === "delete-message") {
    await deletePublicMessage(messageId);
  }
}

async function likePublicMessage(messageId) {
  await withBusy(refreshMessagesButton, async () => {
    const { error } = await state.client.rpc("like_public_message", {
      message_public_id_value: messageId,
      owner_token_hash_value: state.ownerTokenHash
    });
    if (error) throw error;
    await loadPublicMessages();
  });
}

async function editPublicMessage(messageId) {
  const current = state.publicMessages.find((message) => message.public_id === messageId);
  const nextText = prompt("修改留言", current?.message_text || "");
  if (nextText === null) return;

  const text = normalizeText(nextText);
  const validation = validateText(text, 2, 280);
  if (!validation.ok) return setStatus(validation.message, true);

  await withBusy(refreshMessagesButton, async () => {
    const { error } = await state.client.rpc("update_public_message", {
      message_public_id_value: messageId,
      owner_token_hash_value: state.ownerTokenHash,
      message_body: text
    });
    if (error) throw error;
    setStatus("留言已更新。");
    await loadPublicMessages();
  });
}

async function deletePublicMessage(messageId) {
  if (!confirm("删除这条留言？")) return;

  await withBusy(refreshMessagesButton, async () => {
    const { error } = await state.client.rpc("delete_public_message", {
      message_public_id_value: messageId,
      owner_token_hash_value: state.ownerTokenHash
    });
    if (error) throw error;
    setStatus("留言已删除。");
    await loadPublicMessages();
  });
}

async function loadPublicReplies(messageId, container) {
  container.innerHTML = '<p class="muted">正在加载回复...</p>';
  const { data, error } = await state.client.rpc("get_public_message_replies", {
    message_public_id_value: messageId
  });

  if (error) {
    container.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
    container.innerHTML = '<p class="muted">还没有回复。</p>';
    return;
  }

  container.innerHTML = data
    .map(
      (reply) => `
        <div class="inline-reply">
          <p class="reply-meta">${formatDate(reply.created_at)}</p>
          <p>${escapeHtml(reply.reply_text)}</p>
        </div>
      `
    )
    .join("");
}

async function submitPublicReply(event) {
  event.preventDefault();
  if (!state.client) return setStatus("Supabase 尚未配置。", true);

  const form = event.target;
  const card = form.closest("[data-message-id]");
  const messageId = card.dataset.messageId;
  const textarea = form.querySelector("textarea");
  const text = normalizeText(textarea.value);
  const validation = validateText(text, 1, 500);
  if (!validation.ok) return setStatus(validation.message, true);

  await withBusy(form, async () => {
    const { error } = await state.client.rpc("submit_public_message_reply", {
      message_public_id_value: messageId,
      reply_body: text
    });

    if (error) throw error;
    textarea.value = "";
    setStatus("回复已发送。");
    await loadPublicReplies(messageId, card.querySelector(".inline-replies"));
    await loadPublicMessages();
  });
}

async function submitQuestion(event) {
  event.preventDefault();
  if (!state.client) return setStatus("Supabase 尚未配置。", true);

  const text = normalizeQuestionText(questionText.value);
  const validation = validateText(text, 8, 600);
  if (!validation.ok) return setStatus(validation.message, true);

  const token = createToken();
  const tokenHash = await sha256(token);

  await withBusy(questionForm, async () => {
    let { error } = await state.client.rpc("submit_question", {
      question_body: text,
      claim_token_hash_value: tokenHash,
      allow_public_value: questionPublicConsent.checked,
      owner_token_hash_value: state.ownerTokenHash
    });

    if (isMissingRpc(error)) {
      const fallback = await state.client.rpc("submit_question", {
        question_body: text,
        claim_token_hash_value: tokenHash
      });
      error = fallback.error;
    }

    if (error) throw error;

    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("token", token);
    claimLink.value = url.toString();
    claimResult.hidden = false;
    questionForm.reset();
    updateAllCounters();
    setStatus("问题已保存。请保存私人链接。");
  });
}

async function loadRandomQuestion() {
  if (!state.client) return setStatus("Supabase 尚未配置。", true);

  await withBusy(loadQuestionButton, async () => {
    const recentIds = getRecentQuestionIds();
    let { data, error } = await state.client.rpc("get_random_question", {
      answer_limit: Number(config.maxAnswersPerQuestion || 5),
      excluded_public_ids: recentIds
    });

    if (isMissingRpc(error)) {
      const fallback = await state.client.rpc("get_random_question", {
        answer_limit: Number(config.maxAnswersPerQuestion || 5)
      });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    state.currentQuestion = data?.[0] || null;

    if (!state.currentQuestion && recentIds.length) {
      clearRecentQuestionIds();
      return loadRandomQuestion();
    }

    if (!state.currentQuestion) {
      randomQuestionCard.innerHTML =
        '<p class="muted">暂时没有可回答的问题。稍后再试。</p>';
      answerForm.hidden = true;
      skipQuestionButton.hidden = true;
      return;
    }

    rememberQuestionId(state.currentQuestion.public_id);
    randomQuestionCard.innerHTML = `
      <p class="reply-meta">一个匿名问题 · ${Number(state.currentQuestion.answer_count || 0)} 条回复</p>
      <p>${escapeHtml(state.currentQuestion.question_text)}</p>
    `;
    answerForm.hidden = false;
    skipQuestionButton.hidden = false;
    answerText.value = "";
    updateAllCounters();
    setStatus("已抽取一个问题。");
  });
}

async function submitAnswer(event) {
  event.preventDefault();
  if (!state.client) return setStatus("Supabase 尚未配置。", true);
  if (!state.currentQuestion) return setStatus("请先抽取一个问题。", true);

  const text = normalizeText(answerText.value);
  const validation = validateText(text, 2, 1000);
  if (!validation.ok) return setStatus(validation.message, true);

  await withBusy(answerForm, async () => {
    let { error } = await state.client.rpc("submit_answer", {
      question_public_id_value: state.currentQuestion.public_id,
      answer_body: text,
      allow_public_value: answerPublicConsent.checked,
      owner_token_hash_value: state.ownerTokenHash
    });

    if (isMissingRpc(error)) {
      const fallback = await state.client.rpc("submit_answer", {
        question_public_id_value: state.currentQuestion.public_id,
        answer_body: text
      });
      error = fallback.error;
    }

    if (error) throw error;

    answerForm.hidden = true;
    state.currentQuestion = null;
    randomQuestionCard.innerHTML =
      '<p class="muted">回答已发送。你可以再抽一个问题。</p>';
    answerText.value = "";
    answerPublicConsent.checked = false;
    updateAllCounters();
    setStatus("回答已保存。");
  });
}

async function checkReplies(event) {
  event.preventDefault();
  if (!state.client) return setStatus("Supabase 尚未配置。", true);

  const token = extractToken(claimToken.value);
  if (!token) return setStatus("请输入私人链接或 token。", true);

  const tokenHash = await sha256(token);
  state.currentClaimTokenHash = tokenHash;

  await withBusy(checkForm, async () => {
    const { data, error } = await state.client.rpc("get_replies_by_token", {
      claim_token_hash_value: tokenHash
    });

    if (error) throw error;
    renderReplies(data || []);
  });
}

function renderReplies(rows) {
  if (!rows.length) {
    replyList.innerHTML =
      '<div class="reply-item"><p class="muted">没有找到这个 token 对应的问题，或暂时还没有回复。</p></div>';
    setStatus("");
    return;
  }

  const first = rows[0];
  const answers = rows.filter((row) => row.answer_text);
  const answerHtml = answers.length
    ? answers
        .map(
          (row, index) => `
            <article class="reply-item" data-answer-id="${escapeHtml(row.answer_public_id || "")}">
              <p class="reply-meta">匿名回复 ${index + 1}</p>
              <p>${escapeHtml(row.answer_text)}</p>
              ${row.asker_liked ? '<p class="reply-meta">你已喜欢这条回复</p>' : ""}
              ${row.asker_reply_text ? `<div class="inline-reply"><p class="reply-meta">你的补充回复</p><p>${escapeHtml(row.asker_reply_text)}</p></div>` : ""}
              ${row.answer_public_id ? `
                <div class="content-actions">
                  <button class="secondary mini-button" data-action="like-answer" type="button">${row.asker_liked ? "已喜欢" : "喜欢这条回复"}</button>
                </div>
                ${row.asker_reply_text ? "" : `
                  <form class="reply-form">
                    <label for="asker-reply-${escapeHtml(row.answer_public_id)}">给回答者留一句</label>
                    <textarea id="asker-reply-${escapeHtml(row.answer_public_id)}" maxlength="240" placeholder="最多 240 字，只能发送一次。" required></textarea>
                    <div class="form-row">
                      <span class="small">只显示在这组问答里</span>
                      <button type="submit">发送</button>
                    </div>
                  </form>
                `}
              ` : ""}
            </article>
          `
        )
        .join("")
    : '<article class="reply-item"><p class="muted">这个问题还没有收到回复。</p></article>';

  replyList.innerHTML = `
    <article class="question-card">
      <p class="reply-meta">你的问题</p>
      <p>${escapeHtml(first.question_text)}</p>
    </article>
    ${answerHtml}
  `;
  setStatus(`找到 ${answers.length} 条回复。`);
}

async function handleReplyListClick(event) {
  const button = event.target.closest("button[data-action='like-answer']");
  if (!button) return;

  const answerId = button.closest("[data-answer-id]")?.dataset.answerId;
  if (!answerId || !state.currentClaimTokenHash) return;

  await withBusy(button, async () => {
    const { error } = await state.client.rpc("like_answer_by_asker", {
      claim_token_hash_value: state.currentClaimTokenHash,
      answer_public_id_value: answerId
    });
    if (error) throw error;
    setStatus("已喜欢这条回复。");
    await refreshCheckedReplies();
  });
}

async function submitAskerReply(event) {
  event.preventDefault();
  const form = event.target;
  const answerId = form.closest("[data-answer-id]")?.dataset.answerId;
  const textarea = form.querySelector("textarea");
  const text = normalizeText(textarea.value);
  const validation = validateText(text, 1, 240);
  if (!validation.ok) return setStatus(validation.message, true);

  await withBusy(form, async () => {
    const { error } = await state.client.rpc("send_asker_reply", {
      claim_token_hash_value: state.currentClaimTokenHash,
      answer_public_id_value: answerId,
      reply_body: text
    });
    if (error) throw error;
    setStatus("已发送。");
    await refreshCheckedReplies();
  });
}

async function refreshCheckedReplies() {
  const { data, error } = await state.client.rpc("get_replies_by_token", {
    claim_token_hash_value: state.currentClaimTokenHash
  });
  if (error) throw error;
  renderReplies(data || []);
}

async function copyClaim() {
  if (!claimLink.value) return;
  try {
    await navigator.clipboard.writeText(claimLink.value);
    setStatus("链接已复制。");
  } catch {
    claimLink.select();
    setStatus("已选中私人链接，可以手动复制。");
  }
}

function validateText(text, min, max) {
  if (text.length < min) {
    return { ok: false, message: `内容至少需要 ${min} 个字符。` };
  }
  if (text.length > max) {
    return { ok: false, message: `内容不能超过 ${max} 个字符。` };
  }
  if (blockedTerms.some((term) => text.toLowerCase().includes(term.toLowerCase()))) {
    return { ok: false, message: "内容像广告或骚扰信息，请修改后再提交。" };
  }
  return { ok: true };
}

function isMissingRpc(error) {
  return Boolean(
    error &&
      (error.message?.includes("Could not find the function") ||
        error.code === "PGRST202")
  );
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeQuestionText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return normalized;
  return /[?？！!。.]\s*$/.test(normalized) ? normalized : `${normalized}？`;
}

function getVisitorToken() {
  const existing = localStorage.getItem(VISITOR_TOKEN_KEY);
  if (existing) return existing;

  const token = createToken();
  localStorage.setItem(VISITOR_TOKEN_KEY, token);
  return token;
}

function createToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function extractToken(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.searchParams.get("token") || "";
  } catch {
    return trimmed;
  }
}

function getRecentQuestionIds() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_QUESTIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

function rememberQuestionId(publicId) {
  const nextIds = [
    publicId,
    ...getRecentQuestionIds().filter((id) => id !== publicId)
  ].slice(0, MAX_RECENT_QUESTIONS);
  localStorage.setItem(RECENT_QUESTIONS_KEY, JSON.stringify(nextIds));
}

function clearRecentQuestionIds() {
  localStorage.removeItem(RECENT_QUESTIONS_KEY);
}

async function loadMyContent() {
  if (!state.client || !state.ownerTokenHash) return;

  myContent.innerHTML = '<article class="empty-state">正在读取这个浏览器里的内容。</article>';
  const { data, error } = await state.client.rpc("get_my_content", {
    owner_token_hash_value: state.ownerTokenHash
  });

  if (error) {
    myContent.innerHTML = `<article class="empty-state">${escapeHtml(error.message)}</article>`;
    return;
  }

  renderMyContent(data || []);
}

function renderMyContent(items) {
  const groups = {
    question: items.filter((item) => item.item_type === "question"),
    answer: items.filter((item) => item.item_type === "answer"),
    public_message: items.filter((item) => item.item_type === "public_message")
  };

  myContent.innerHTML = `
    ${renderMySection("我的问题", groups.question, "question")}
    ${renderMySection("我的回答", groups.answer, "answer")}
    ${renderMySection("我的留言", groups.public_message, "public_message")}
  `;
}

function renderMySection(title, items, type) {
  if (!items.length) {
    return `
      <section class="mine-section">
        <h3>${title}</h3>
        <article class="empty-state">暂无内容。</article>
      </section>
    `;
  }

  return `
    <section class="mine-section">
      <h3>${title}</h3>
      ${items
        .map((item) => {
          const canEditQuestion = type === "question" && Number(item.reply_count || 0) === 0;
          const canEditMessage = type === "public_message";
          const canDelete = type !== "answer";
          return `
            <article class="content-card" data-my-type="${type}" data-my-id="${escapeHtml(item.public_id)}">
              <p class="message-meta">${formatDate(item.created_at)}${item.edited_at ? ` · 已于 ${formatDate(item.edited_at)} 编辑过` : ""}${item.reply_count ? ` · ${Number(item.reply_count)} 条回复` : ""}</p>
              <p class="message-body">${escapeHtml(item.body)}</p>
              <div class="content-actions">
                ${canEditQuestion || canEditMessage ? '<button class="secondary mini-button" data-action="edit-my" type="button">编辑</button>' : ""}
                ${canDelete ? '<button class="secondary mini-button danger-button" data-action="delete-my" type="button">删除</button>' : ""}
              </div>
            </article>
          `;
        })
        .join("")}
    </section>
  `;
}

async function handleMyContentClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const card = button.closest("[data-my-type]");
  const type = card.dataset.myType;
  const id = card.dataset.myId;
  const currentText = card.querySelector(".message-body")?.textContent || "";

  if (button.dataset.action === "edit-my") {
    const nextText = prompt("修改内容", currentText);
    if (nextText === null) return;
    await editMyContent(type, id, nextText);
  }

  if (button.dataset.action === "delete-my") {
    if (!confirm("删除这条内容？")) return;
    await deleteMyContent(type, id);
  }
}

async function editMyContent(type, id, value) {
  const text = type === "question" ? normalizeQuestionText(value) : normalizeText(value);
  const max = type === "question" ? 600 : 280;
  const min = type === "question" ? 8 : 2;
  const validation = validateText(text, min, max);
  if (!validation.ok) return setStatus(validation.message, true);

  const rpcName = type === "question" ? "update_my_question" : "update_public_message";
  const params =
    type === "question"
      ? {
          question_public_id_value: id,
          owner_token_hash_value: state.ownerTokenHash,
          question_body: text
        }
      : {
          message_public_id_value: id,
          owner_token_hash_value: state.ownerTokenHash,
          message_body: text
        };

  const { error } = await state.client.rpc(rpcName, params);
  if (error) return setStatus(error.message, true);

  setStatus("已更新。");
  await loadMyContent();
  if (type === "public_message") await loadPublicMessages();
}

async function deleteMyContent(type, id) {
  const rpcName = type === "question" ? "delete_my_question" : "delete_public_message";
  const params =
    type === "question"
      ? { question_public_id_value: id, owner_token_hash_value: state.ownerTokenHash }
      : { message_public_id_value: id, owner_token_hash_value: state.ownerTokenHash };

  const { error } = await state.client.rpc(rpcName, params);
  if (error) return setStatus(error.message, true);

  setStatus("已删除。");
  await loadMyContent();
  if (type === "public_message") await loadPublicMessages();
}

async function withBusy(element, task) {
  const buttons = [...element.querySelectorAll?.("button"), element].filter(
    (item) => item?.tagName === "BUTTON"
  );
  buttons.forEach((button) => (button.disabled = true));
  setStatus("处理中...");

  try {
    await task();
  } catch (error) {
    console.error(error);
    setStatus(error.message || "发生了一点错误，请稍后再试。", true);
  } finally {
    buttons.forEach((button) => (button.disabled = false));
  }
}

function updateAllCounters() {
  document.querySelectorAll("[data-counter-for]").forEach((counter) => {
    const input = document.querySelector(`#${counter.dataset.counterFor}`);
    counter.textContent = `${input.value.length} / ${input.maxLength}`;
  });
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", isError);
}

function formatDate(value) {
  if (!value) return "刚刚";
  return new Intl.DateTimeFormat("zh-Hans", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}
