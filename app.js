let config = window.BOTTLE_CONFIG || {};

const state = {
  currentQuestion: null,
  client: null
};

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

const questionForm = document.querySelector("#question-form");
const questionText = document.querySelector("#question-text");
const claimResult = document.querySelector("#claim-result");
const claimLink = document.querySelector("#claim-link");
const copyClaimLink = document.querySelector("#copy-claim-link");

const loadQuestionButton = document.querySelector("#load-question");
const skipQuestionButton = document.querySelector("#skip-question");
const randomQuestionCard = document.querySelector("#random-question-card");
const answerForm = document.querySelector("#answer-form");
const answerText = document.querySelector("#answer-text");

const checkForm = document.querySelector("#check-form");
const claimToken = document.querySelector("#claim-token");
const replyList = document.querySelector("#reply-list");

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

  state.client = window.supabase.createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );
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
    // Local static development can use ignored config.js instead.
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
  showView("ask");
}

function showView(id) {
  views.forEach((view) => view.classList.toggle("is-active", view.id === id));
  viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === id);
  });
  setStatus("");
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

async function submitQuestion(event) {
  event.preventDefault();
  if (!state.client) return setStatus("Supabase 尚未配置。", true);

  const text = normalizeText(questionText.value);
  const validation = validateText(text, 8, 600);
  if (!validation.ok) return setStatus(validation.message, true);

  const token = createToken();
  const tokenHash = await sha256(token);

  await withBusy(questionForm, async () => {
    const { error } = await state.client.rpc("submit_question", {
      question_body: text,
      claim_token_hash_value: tokenHash
    });

    if (error) throw error;

    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("token", token);
    claimLink.value = url.toString();
    claimResult.hidden = false;
    questionForm.reset();
    updateAllCounters();
    setStatus("问题已经放进漂流瓶。请保存私人链接。");
  });
}

async function loadRandomQuestion() {
  if (!state.client) return setStatus("Supabase 尚未配置。", true);

  await withBusy(loadQuestionButton, async () => {
    const { data, error } = await state.client.rpc("get_random_question", {
      answer_limit: Number(config.maxAnswersPerQuestion || 5)
    });

    if (error) throw error;
    state.currentQuestion = data?.[0] || null;

    if (!state.currentQuestion) {
      randomQuestionCard.innerHTML =
        '<p class="muted">暂时没有可回答的问题。过一会儿再来看看。</p>';
      answerForm.hidden = true;
      skipQuestionButton.hidden = true;
      return;
    }

    randomQuestionCard.innerHTML = `
      <p class="reply-meta">一个匿名问题</p>
      <p>${escapeHtml(state.currentQuestion.question_text)}</p>
    `;
    answerForm.hidden = false;
    skipQuestionButton.hidden = false;
    answerText.value = "";
    updateAllCounters();
    setStatus("抽到一个问题。");
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
    const { error } = await state.client.rpc("submit_answer", {
      question_public_id_value: state.currentQuestion.public_id,
      answer_body: text
    });

    if (error) throw error;

    answerForm.hidden = true;
    state.currentQuestion = null;
    randomQuestionCard.innerHTML =
      '<p class="muted">回答已经送出。你可以再抽一个问题。</p>';
    answerText.value = "";
    updateAllCounters();
    setStatus("谢谢，你的回答已经保存。");
  });
}

async function checkReplies(event) {
  event.preventDefault();
  if (!state.client) return setStatus("Supabase 尚未配置。", true);

  const token = extractToken(claimToken.value);
  if (!token) return setStatus("请输入私人链接或 token。", true);

  const tokenHash = await sha256(token);

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
            <article class="reply-item">
              <p class="reply-meta">匿名回复 ${index + 1}</p>
              <p>${escapeHtml(row.answer_text)}</p>
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

async function copyClaim() {
  if (!claimLink.value) return;
  try {
    await navigator.clipboard.writeText(claimLink.value);
    setStatus("私人链接已复制。");
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

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
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

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}
