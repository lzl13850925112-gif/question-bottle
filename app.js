let config = window.BOTTLE_CONFIG || {};

const state = {
  currentQuestion: null,
  client: null,
  publicMessages: [],
  visiblePublicMessages: [],
  publicFilterMode: "default",
  publicSortMode: "newest_first",
  questionPoolFilter: "all",
  hiddenPublicMessageIds: [],
  linkedPublicMessageId: "",
  visitorToken: "",
  hadStoredVisitorToken: false,
  ownerTokenHash: "",
  currentClaimTokenHash: ""
};

const RECENT_QUESTIONS_KEY = "questionBottle.recentQuestionIds";
const VISITOR_TOKEN_KEY = "questionBottle.visitorToken";
const HIDDEN_PUBLIC_MESSAGES_KEY = "questionBottle.hiddenPublicMessageIds";
const LOCAL_QUESTION_TOKENS_KEY = "questionBottle.localQuestionTokens";
const MAX_RECENT_QUESTIONS = 12;
const PUBLIC_MESSAGE_COLLAPSE_LENGTH = 140;
const PUBLIC_MESSAGE_FOCUS_MS = 1600;

const blockedTerms = [
  "spam.example",
  "加微信",
  "博彩",
  "裸聊",
  "贷款"
];

const SEED_QUESTION_TEXTS = [
  "你最近循环最多的一首歌是什么？",
  "今天有没有发生什么根本不值得发朋友圈、但你记住了的小事？",
  "你最近最常重复的一句话是什么？",
  "最近有没有什么东西在慢慢消耗你？",
  "你最近删掉过什么？",
  "最近一次熬夜，你在干什么？",
  "你现在最不想听到别人对你说什么？",
  "你有没有一个一直没舍得退出的AI聊天框？它对你有什么意义？",
  "最近有没有一句话，你已经想好很久，但一直没发出去？",
  "有没有一个人，你先要恢复联系，现在已经不知道该怎么重新开口？他过的怎么样？",
  "你最近一次突然不想解释了，是因为什么？",
  "最近有没有一个瞬间，让你突然觉得和一个人的关系变了？",
  "有没有谁其实对你很好，但你一直没认真回应过？",
  "有没有一天，你现在回头看，会觉得像分界线？",
  "你最近一次感觉“时间过得太快”是在什么时候？",
  "有没有什么东西，你以前天天接触，现在却突然消失了？",
  "有没有什么事情没人问过你，但你希望被询问？",
  "最近有没有什么事情，你本来以为自己已经不在意了？",
  "有没有什么话，你现在已经不打算再解释了？",
  "最近有没有一个瞬间，你突然很想离开现在的生活？",
  "你最近最不想面对的一件事是什么？",
  "你最近有没有在哪一瞬间突然很想回到以前？",
  "如果今天只能留下一句话，你会写什么？",
  "你最近吃到最好吃的东西是什么？",
  "最近有没有一首歌突然又重新开始听了？",
  "你最近一次出门是为了什么？",
  "你现在最常逃避的一件小事是什么？",
  "最近有没有一件小事，让你突然心情变好了一点？",
  "最近有没有什么东西，你一直想整理，但始终没动？",
  "你最近有没有突然意识到，某段时间已经过去很久了？",
  "有没有一个地方，你现在经过时还是会下意识看一眼？",
  "最近有没有什么东西，其实你已经想丢掉很久了？",
  "你最近最常发呆的时候是在干什么？",
  "最近有没有什么话，你差一点就说出口了？",
  "你最近一次真正睡好觉是什么时候？",
  "有没有什么东西，你以前特别在意，现在已经无所谓了？",
  "你最近有没有突然很想关掉所有聊天软件？",
  "有没有什么地方，你一直说想去，但到现在还没去？",
  "最近有没有什么没有定论的事情，你其实已经知道结果了？",
  "你对自己高考最后的结果满意吗？",
  "你高中毕业后的那个暑假，是怎么度过的？",
  "回想一个离开了你的重要的人，你现在对他有何态度？",
  "你吃甜粽子还是咸粽子？",
  "你对AI的依赖程度高吗？",
  "你下个周末最想做的一件事是什么？",
  "有没有一个人，你现在已经不想再了解他的消息了？",
  "有没有什么习惯在你自己都没意识到的时候已经形成了？",
  "最近有没有什么事情，你其实很想重新来一次？",
  "你最近有没有在哪一刻突然觉得自己长大了？",
  "你最近最常重复听到的一句话是什么？",
  "最近有没有什么事情，你明知道应该做，但一直拖着？",
  "你最近有没有什么想买但一直没买的东西？",
  "最近有没有一个瞬间，你突然不想回那个人的消息了？",
  "你最近最常点的外卖是什么？",
  "你最近一次睡过头是在什么时候？",
  "你最近是不是懒得出门？",
  "你最近一次认真收拾房间或宿舍是什么时候？",
  "最近有没有什么事情，你拖着拖着就忘了？",
  "你最近最常打开但其实没什么要看的软件是什么？",
  "你最近一次突然很困是在干什么？",
  "最近有没有哪一天，你几乎什么都没干？",
  "你最近有没有突然特别想吃某样东西？",
  "你最近最经常在哪个时间点睡觉？",
  "最近有没有什么事情，本来很担心，后来发现其实没什么？",
  "你最近最常待的地方是哪里？",
  "最近有没有什么事情，你原本很期待，后来却没什么感觉了？",
  "你最近最常一个人待着的时候在干什么？"
];

const SEED_QUESTIONS = [...new Set(SEED_QUESTION_TEXTS)].map((text, index) => ({
  id: `seed-question-${String(index + 1).padStart(3, "0")}`,
  text,
  is_seed: true,
  source: "owner_seed",
  may_be_ai_generated: true
}));

const SITE_NOTE = {
  version: "2.5",
  text: "可以用本设备保留的本地记录，尝试找回旧问题的回复。"
};

const statusEl = document.querySelector("#status");
const siteNote = document.querySelector("#site-note");
const views = [...document.querySelectorAll(".panel")];
const viewButtons = [...document.querySelectorAll("[data-view]")];

const publicMessageForm = document.querySelector("#public-message-form");
const publicMessageText = document.querySelector("#public-message-text");
const publicMessageList = document.querySelector("#public-message-list");
const publicMessageFilter = document.querySelector("#public-message-filter");
const publicMessageSort = document.querySelector("#public-message-sort");
const randomPublicMessageButton = document.querySelector("#random-public-message");
const restoreHiddenMessagesButton = document.querySelector("#restore-hidden-messages");
const refreshMessagesButton = document.querySelector("#refresh-messages");

const questionForm = document.querySelector("#question-form");
const questionText = document.querySelector("#question-text");
const questionPublicConsent = document.querySelector("#question-public-consent");
const claimResult = document.querySelector("#claim-result");
const claimLink = document.querySelector("#claim-link");
const copyClaimLink = document.querySelector("#copy-claim-link");

const loadQuestionButton = document.querySelector("#load-question");
const skipQuestionButton = document.querySelector("#skip-question");
const questionPoolFilter = document.querySelector("#question-pool-filter");
const randomQuestionCard = document.querySelector("#random-question-card");
const answerForm = document.querySelector("#answer-form");
const answerText = document.querySelector("#answer-text");
const answerPublicConsent = document.querySelector("#answer-public-consent");
const answerPublicConsentLine = answerPublicConsent?.closest(".check-line");
const answerPublicConsentText = document.querySelector("#answer-public-consent-text");
const seedQuestionNotice = document.querySelector("#seed-question-notice");

const checkForm = document.querySelector("#check-form");
const claimToken = document.querySelector("#claim-token");
const replyList = document.querySelector("#reply-list");
const myContent = document.querySelector("#my-content");

init();

async function init() {
  bindNavigation();
  bindCounters();
  bindForms();
  renderSiteNote();
  renderSeedQuestionNotice();
  openTokenFromUrl();
  state.linkedPublicMessageId = getLinkedPublicMessageId();
  await loadConfig();

  if (!window.supabase || !isConfigured()) {
    setStatus("服务暂时不可用，请稍后再试。", true);
    return;
  }

  if (!crypto?.subtle) {
    setStatus("当前页面需要 HTTPS 或 localhost，才能安全生成私人 token。", true);
    return;
  }

  state.hadStoredVisitorToken = hasStoredVisitorToken();
  state.visitorToken = getVisitorToken();
  state.ownerTokenHash = await sha256(state.visitorToken);
  state.hiddenPublicMessageIds = getHiddenPublicMessageIds();
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
  publicMessageFilter?.addEventListener("change", handlePublicFilterChange);
  publicMessageSort?.addEventListener("change", handlePublicSortChange);
  randomPublicMessageButton?.addEventListener("click", showRandomPublicMessage);
  restoreHiddenMessagesButton?.addEventListener("click", restoreHiddenPublicMessages);
  refreshMessagesButton.addEventListener("click", loadPublicMessages);
  publicMessageList.addEventListener("click", handlePublicMessageClick);
  publicMessageList.addEventListener("submit", submitPublicReply);
  replyList.addEventListener("click", handleReplyListClick);
  replyList.addEventListener("submit", submitAskerReply);
  myContent.addEventListener("click", handleMyContentClick);
  questionForm.addEventListener("submit", submitQuestion);
  questionPoolFilter?.addEventListener("change", handleQuestionPoolFilterChange);
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
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);

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
    state.hadStoredVisitorToken = true;
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
    renderCurrentPublicMessages();
    setStatus(state.publicMessages.length ? "" : "暂无公开留言。");
    window.setTimeout(focusLinkedPublicMessage, 0);
  });
}

function handlePublicFilterChange(event) {
  state.publicFilterMode = event.target.value;
  renderCurrentPublicMessages();
}

function handlePublicSortChange(event) {
  state.publicSortMode = event.target.value;
  renderCurrentPublicMessages();
}

function renderCurrentPublicMessages() {
  const visibleMessages = sortPublicMessages(
    filterPublicMessages(
      state.publicMessages.filter((message) => !isPublicMessageHidden(message.public_id)),
      state.publicFilterMode
    ),
    state.publicSortMode
  );
  state.visiblePublicMessages = visibleMessages;
  updateHiddenMessagesControl();
  renderPublicMessages(
    visibleMessages
  );
}

function filterPublicMessages(messages, filterMode) {
  if (filterMode === "unanswered_only") {
    return messages.filter((message) => Number(message.reply_count || 0) === 0);
  }

  if (filterMode === "related_to_me") {
    return messages.filter((message) => message.owned_by_me || message.liked_by_me);
  }

  if (filterMode === "public_questions") {
    return messages.filter((message) => message.message_kind === "bottle_qa");
  }

  if (filterMode === "message_posts") {
    return messages.filter((message) => message.message_kind !== "bottle_qa");
  }

  return messages;
}

function sortPublicMessages(messages, sortMode) {
  const sortedMessages = [...messages];
  const createdAtTime = (message) => new Date(message.created_at || 0).getTime();
  const lastReplyAtTime = (message) => new Date(message.last_reply_at || 0).getTime();
  const likeCount = (message) => Number(message.like_count || 0);
  const replyCount = (message) => Number(message.reply_count || 0);
  const recommendedScore = (message) => {
    const ageHours = Math.max(0, (Date.now() - createdAtTime(message)) / 36e5);
    const recencyScore = 1 / (1 + ageHours / 24);
    return likeCount(message) * 3 + replyCount(message) + recencyScore * 2;
  };

  if (sortMode === "oldest_first") {
    return sortedMessages.sort((a, b) => createdAtTime(a) - createdAtTime(b));
  }

  if (sortMode === "most_liked") {
    return sortedMessages.sort((a, b) => {
      const likeDifference = likeCount(b) - likeCount(a);
      return likeDifference || createdAtTime(b) - createdAtTime(a);
    });
  }

  if (sortMode === "recently_replied") {
    const hasLastReplyAt = sortedMessages.some((message) => message.last_reply_at);
    if (hasLastReplyAt) {
      return sortedMessages.sort((a, b) => {
        const replyTimeDifference = lastReplyAtTime(b) - lastReplyAtTime(a);
        return replyTimeDifference || createdAtTime(b) - createdAtTime(a);
      });
    }

    return sortedMessages.sort((a, b) => {
      const replyDifference = replyCount(b) - replyCount(a);
      return replyDifference || createdAtTime(b) - createdAtTime(a);
    });
  }

  if (sortMode === "codex_recommended") {
    return sortedMessages.sort((a, b) => {
      const scoreDifference = recommendedScore(b) - recommendedScore(a);
      return scoreDifference || createdAtTime(b) - createdAtTime(a);
    });
  }

  return sortedMessages.sort((a, b) => createdAtTime(b) - createdAtTime(a));
}

function renderPublicMessages(messages) {
  if (!messages.length) {
    publicMessageList.innerHTML =
      '<article class="empty-state">没有符合当前条件的留言。</article>';
    return;
  }

  publicMessageList.innerHTML = messages.map(renderPublicMessageCard).join("");
}

function renderPublicMessageCard(message) {
  const body = message.message_text || "";
  const isLongBody = body.length > PUBLIC_MESSAGE_COLLAPSE_LENGTH;
  const replyCount = Number(message.reply_count || 0);
  const likeCount = Number(message.like_count || 0);
  const messageId = escapeHtml(message.public_id);

  return `
    <article class="message-card" id="post-${messageId}" data-message-id="${messageId}">
      <div class="message-topline">
        <p class="message-meta">${formatDate(message.created_at)}${message.edited_at ? ` · 已编辑` : ""}</p>
        ${message.message_kind === "bottle_qa" ? '<span class="message-kind">公开问答</span>' : ""}
      </div>
      <p class="message-stats">
        <span class="reply-stat">${replyCount} 条回复</span>
        <span>${likeCount} 个喜欢</span>
      </p>
      <p class="message-body${isLongBody ? " is-collapsed" : ""}">${escapeHtml(body)}</p>
      ${isLongBody ? '<button class="text-button" data-action="toggle-message-body" type="button">展开全文</button>' : ""}
      <div class="message-actions">
        <button class="secondary mini-button" data-action="toggle-replies" type="button">展开回复</button>
        <button class="secondary mini-button" data-action="like-message" type="button">${message.liked_by_me ? "已喜欢" : "喜欢"}</button>
        <button class="secondary mini-button" data-action="copy-message-link" type="button">复制链接</button>
        <button class="secondary mini-button" data-action="hide-message" type="button">隐藏此条</button>
        ${message.owned_by_me ? '<button class="secondary mini-button" data-action="edit-message" type="button">编辑</button><button class="secondary mini-button danger-button" data-action="delete-message" type="button">删除</button>' : ""}
      </div>
      <div class="inline-replies" hidden></div>
      <form class="reply-form" hidden>
        <label for="reply-${messageId}">匿名回复</label>
        <textarea id="reply-${messageId}" maxlength="500" placeholder="写一句回复。" required></textarea>
        <div class="form-row">
          <span class="small">最多 500 字</span>
          <button type="submit">发送回复</button>
        </div>
      </form>
    </article>
  `;
}

async function handlePublicMessageClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const card = button.closest("[data-message-id]");
  const messageId = card.dataset.messageId;

  if (button.dataset.action === "toggle-message-body") {
    togglePublicMessageBody(card, button);
  }

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

  if (button.dataset.action === "copy-message-link") {
    await copyPublicMessageLink(messageId);
  }

  if (button.dataset.action === "hide-message") {
    hidePublicMessage(messageId);
  }

  if (button.dataset.action === "edit-message") {
    await editPublicMessage(messageId);
  }

  if (button.dataset.action === "delete-message") {
    await deletePublicMessage(messageId);
  }
}

function togglePublicMessageBody(card, button) {
  const body = card.querySelector(".message-body");
  const isCollapsed = body.classList.toggle("is-collapsed");
  button.textContent = isCollapsed ? "展开全文" : "收起";
}

async function copyPublicMessageLink(messageId) {
  const url = new URL(window.location.href);
  url.searchParams.delete("token");
  url.searchParams.set("post", messageId);
  url.hash = "";
  const link = url.toString();

  try {
    await navigator.clipboard.writeText(link);
    setStatus("链接已复制。");
  } catch {
    prompt("复制这条链接", link);
    setStatus("已生成链接，可手动复制。");
  }
}

function hidePublicMessage(messageId) {
  if (!state.hiddenPublicMessageIds.includes(messageId)) {
    state.hiddenPublicMessageIds = [...state.hiddenPublicMessageIds, messageId];
    saveHiddenPublicMessageIds();
  }
  renderCurrentPublicMessages();
  setStatus("已在当前浏览器隐藏这条留言。");
}

function restoreHiddenPublicMessages() {
  state.hiddenPublicMessageIds = [];
  saveHiddenPublicMessageIds();
  renderCurrentPublicMessages();
  setStatus("已恢复隐藏的留言。");
}

function showRandomPublicMessage() {
  if (!state.visiblePublicMessages.length) {
    return setStatus("当前没有可查看的留言。", true);
  }

  const message =
    state.visiblePublicMessages[
      Math.floor(Math.random() * state.visiblePublicMessages.length)
    ];
  focusPublicMessage(message.public_id);
}

function focusPublicMessage(messageId) {
  const card = [...publicMessageList.querySelectorAll("[data-message-id]")].find(
    (item) => item.dataset.messageId === messageId
  );

  if (!card) {
    setStatus("这条留言当前未显示。");
    return false;
  }

  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.add("is-focused");
  window.setTimeout(() => {
    card.classList.remove("is-focused");
  }, PUBLIC_MESSAGE_FOCUS_MS);
  return true;
}

function getLinkedPublicMessageId() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get("post");
  if (postId) return postId;

  const hash = window.location.hash || "";
  return hash.startsWith("#post-") ? hash.slice(6) : "";
}

function focusLinkedPublicMessage() {
  if (!state.linkedPublicMessageId) return;

  const didFocus = focusPublicMessage(state.linkedPublicMessageId);
  state.linkedPublicMessageId = "";
  if (!didFocus) {
    setStatus("这条留言当前未显示，可调整筛选或恢复隐藏内容。");
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
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);

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
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);

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
    await rememberSubmittedQuestionToken(text, token);
    state.hadStoredVisitorToken = true;
    questionForm.reset();
    updateAllCounters();
    setStatus("问题已保存。也可以稍后在“我的内容”里查看。");
  });
}

async function loadRandomQuestion() {
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);

  if (state.questionPoolFilter === "seed_only") {
    loadSeedQuestion();
    return;
  }

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
    resetAnswerFormForQuestion();
    updateAllCounters();
    setStatus("已抽取一个问题。");
  });
}

function handleQuestionPoolFilterChange(event) {
  state.questionPoolFilter = event.target.value;
  state.currentQuestion = null;
  answerForm.hidden = true;
  skipQuestionButton.hidden = true;
  resetAnswerFormForQuestion();
  if (seedQuestionNotice) {
    seedQuestionNotice.hidden = state.questionPoolFilter !== "seed_only";
  }
  randomQuestionCard.innerHTML =
    '<p class="muted">点击下面的按钮抽取一个问题。</p>';
  updateAllCounters();
}

function loadSeedQuestion() {
  const seedQuestion =
    SEED_QUESTIONS[Math.floor(Math.random() * SEED_QUESTIONS.length)];

  state.currentQuestion = {
    ...seedQuestion,
    public_id: seedQuestion.id,
    question_text: seedQuestion.text,
    answer_count: 0
  };
  randomQuestionCard.innerHTML = `
    <p class="reply-meta">种子问题</p>
    <p>${escapeHtml(seedQuestion.text)}</p>
  `;
  answerForm.hidden = false;
  skipQuestionButton.hidden = false;
  answerText.value = "";
  answerText.maxLength = getSeedAnswerMaxLength(seedQuestion.text);
  answerPublicConsent.checked = false;
  answerPublicConsentLine?.removeAttribute("hidden");
  if (answerPublicConsentText) {
    answerPublicConsentText.textContent =
      "我知道这条回答会和种子问题一起公开显示在留言板。";
  }
  if (seedQuestionNotice) seedQuestionNotice.hidden = false;
  updateAllCounters();
  setStatus("已抽取一个种子问题。");
}

async function submitAnswer(event) {
  event.preventDefault();
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);
  if (!state.currentQuestion) return setStatus("请先抽取一个问题。", true);

  const text = normalizeText(answerText.value);
  const validation = validateText(text, 2, 1000);
  if (!validation.ok) return setStatus(validation.message, true);

  if (state.currentQuestion.is_seed) {
    await submitSeedAnswer(text);
    return;
  }

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
    resetAnswerFormForQuestion();
    updateAllCounters();
    state.hadStoredVisitorToken = true;
    setStatus("回答已保存。");
  });
}

async function submitSeedAnswer(text) {
  if (!answerPublicConsent.checked) {
    return setStatus("请先确认这条回答会公开显示在留言板。", true);
  }

  const messageText = formatSeedAnswerMessage(state.currentQuestion.question_text, text);
  const validation = validateText(messageText, 2, 280);
  if (!validation.ok) {
    return setStatus("这条回答有点长，请缩短后再发布。", true);
  }

  await withBusy(answerForm, async () => {
    const { error } = await state.client.rpc("submit_public_message", {
      message_body: messageText,
      owner_token_hash_value: state.ownerTokenHash
    });

    if (error) throw error;

    answerForm.hidden = true;
    state.currentQuestion = null;
    randomQuestionCard.innerHTML =
      '<p class="muted">回答已发布到留言板。你可以再抽一个问题。</p>';
    resetAnswerFormForQuestion();
    updateAllCounters();
    setStatus("回答已发布到留言板。");
    await loadPublicMessages();
  });
}

function formatSeedAnswerMessage(questionText, answerBody) {
  return `问：${questionText} 答：${answerBody}`;
}

function getSeedAnswerMaxLength(questionText) {
  return Math.max(2, 280 - formatSeedAnswerMessage(questionText, "").length);
}

function resetAnswerFormForQuestion() {
  answerText.value = "";
  answerText.maxLength = 1000;
  answerPublicConsent.checked = false;
  if (answerPublicConsentText) {
    answerPublicConsentText.textContent =
      "如果提问者也同意，这组匿名问答可以公开显示。";
  }
}

async function checkReplies(event) {
  event.preventDefault();
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);

  const token = extractToken(claimToken.value);
  if (!token) return setStatus("请输入私人链接或 token。", true);

  await checkRepliesByToken(token);
}

async function checkRepliesByToken(token) {
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

function renderReplies(rows, options = {}) {
  const allowFeedback = options.allowFeedback !== false;
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
              ${allowFeedback && row.answer_public_id ? `
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

function hasStoredVisitorToken() {
  return Boolean(localStorage.getItem(VISITOR_TOKEN_KEY));
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

function getLocalQuestionTokens() {
  try {
    const tokens = JSON.parse(localStorage.getItem(LOCAL_QUESTION_TOKENS_KEY) || "{}");
    return tokens && typeof tokens === "object" ? tokens : {};
  } catch {
    return {};
  }
}

function rememberLocalQuestionToken(publicId, token) {
  if (!publicId || !token) return;

  const tokens = getLocalQuestionTokens();
  tokens[publicId] = token;
  localStorage.setItem(LOCAL_QUESTION_TOKENS_KEY, JSON.stringify(tokens));
}

function getLocalQuestionToken(publicId) {
  return getLocalQuestionTokens()[publicId] || "";
}

async function rememberSubmittedQuestionToken(questionBody, token) {
  if (!state.client || !state.ownerTokenHash) return;

  const { data, error } = await state.client.rpc("get_my_content", {
    owner_token_hash_value: state.ownerTokenHash
  });
  if (error) return;

  const question = (data || [])
    .filter((item) => item.item_type === "question" && item.body === questionBody)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];

  if (question?.public_id) rememberLocalQuestionToken(question.public_id, token);
}

function getHiddenPublicMessageIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(HIDDEN_PUBLIC_MESSAGES_KEY) || "[]");
    return Array.isArray(ids) ? ids.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveHiddenPublicMessageIds() {
  localStorage.setItem(
    HIDDEN_PUBLIC_MESSAGES_KEY,
    JSON.stringify(state.hiddenPublicMessageIds)
  );
}

function isPublicMessageHidden(publicId) {
  return state.hiddenPublicMessageIds.includes(publicId);
}

function updateHiddenMessagesControl() {
  if (!restoreHiddenMessagesButton) return;

  const count = state.hiddenPublicMessageIds.length;
  restoreHiddenMessagesButton.hidden = count === 0;
  restoreHiddenMessagesButton.textContent = count
    ? `恢复已隐藏内容（${count}）`
    : "恢复已隐藏内容";
}

function renderSiteNote() {
  if (!siteNote) return;

  siteNote.textContent = `v${SITE_NOTE.version} · ${SITE_NOTE.text}`;
  siteNote.hidden = false;
}

function renderSeedQuestionNotice() {
  if (!seedQuestionNotice) return;

  seedQuestionNotice.textContent =
    `种子问题会不定期补充。当前 ${SEED_QUESTIONS.length} 个；回答会公开显示在留言板。`;
}

async function loadMyContent() {
  if (!state.client || !state.ownerTokenHash) return;

  if (!state.hadStoredVisitorToken) {
    myContent.innerHTML =
      '<article class="empty-state">这台设备里没有找到本地记录。可能是更换设备、清理浏览器数据或使用无痕模式导致。</article>';
    return;
  }

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
          const localToken = type === "question" ? getLocalQuestionToken(item.public_id) : "";
          return `
            <article class="content-card" data-my-type="${type}" data-my-id="${escapeHtml(item.public_id)}">
              <p class="message-meta">${formatDate(item.created_at)}${item.edited_at ? ` · 已于 ${formatDate(item.edited_at)} 编辑过` : ""}${item.reply_count ? ` · ${Number(item.reply_count)} 条回复` : ""}</p>
              <p class="message-body">${escapeHtml(item.body)}</p>
              <div class="content-actions">
                ${localToken ? '<button class="secondary mini-button" data-action="view-replies" type="button">查看回复</button>' : ""}
                ${type === "question" && !localToken ? '<button class="secondary mini-button" data-action="recover-replies" type="button">找回回复</button>' : ""}
                ${canEditQuestion || canEditMessage ? '<button class="secondary mini-button" data-action="edit-my" type="button">编辑</button>' : ""}
                ${canDelete ? '<button class="secondary mini-button danger-button" data-action="delete-my" type="button">删除</button>' : ""}
              </div>
              ${type === "question" && !localToken ? '<p class="message-meta">如果这是旧问题，可以尝试用本设备记录找回回复。</p>' : ""}
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

  if (button.dataset.action === "view-replies") {
    const token = getLocalQuestionToken(id);
    if (!token) return setStatus("这个问题没有保存在本浏览器的私人 token。", true);
    claimToken.value = token;
    showView("check");
    await checkRepliesByToken(token);
  }

  if (button.dataset.action === "recover-replies") {
    showView("check");
    claimToken.value = "";
    await recoverRepliesByOwnedQuestion(id);
  }

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

async function recoverRepliesByOwnedQuestion(questionPublicId) {
  if (!state.client || !state.ownerTokenHash) return;

  state.currentClaimTokenHash = "";
  await withBusy(checkForm, async () => {
    const { data, error } = await state.client.rpc("get_my_question_replies", {
      owner_token_hash_value: state.ownerTokenHash,
      question_public_id_value: questionPublicId
    });

    if (isMissingRpc(error)) {
      replyList.innerHTML =
        '<div class="reply-item"><p class="muted">这个找回入口需要更新数据库函数后才能使用。</p></div>';
      setStatus("");
      return;
    }

    if (error) throw error;
    renderReplies(data || [], { allowFeedback: false });
  });
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
