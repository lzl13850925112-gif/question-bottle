const ADMIN_URL_KEY = "questionBottle.adminSupabaseUrl";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", ""]);
const STATUS_LABELS = {
  new: "未处理",
  reviewing: "处理中",
  done: "已整理",
  ignored: "暂不处理"
};

let adminClient = null;
let feedbackRows = [];

const connectForm = document.querySelector("#admin-connect-form");
const urlInput = document.querySelector("#admin-supabase-url");
const keyInput = document.querySelector("#admin-service-key");
const statusFilter = document.querySelector("#admin-status-filter");
const refreshButton = document.querySelector("#admin-refresh");
const list = document.querySelector("#admin-feedback-list");
const statusEl = document.querySelector("#admin-status");

initAdmin();

function initAdmin() {
  if (!isLocalAdminPage()) {
    connectForm.hidden = true;
    refreshButton.disabled = true;
    list.innerHTML =
      '<article class="empty-state">这个整理页只允许在本地环境使用。</article>';
    setAdminStatus("请在 localhost 或本地文件中打开。", true);
    return;
  }

  urlInput.value = localStorage.getItem(ADMIN_URL_KEY) || "";
  connectForm.addEventListener("submit", connectAdmin);
  statusFilter.addEventListener("change", renderFeedbackRows);
  refreshButton.addEventListener("click", loadFeedbackRows);
  list.addEventListener("click", handleFeedbackAction);
  list.addEventListener("change", handleFeedbackStatusChange);
}

function isLocalAdminPage() {
  return location.protocol === "file:" || LOCAL_HOSTS.has(location.hostname);
}

async function connectAdmin(event) {
  event.preventDefault();
  const url = normalizeSupabaseUrl(urlInput.value);
  const key = keyInput.value.trim();

  if (!url || !key) return setAdminStatus("请填写 Supabase URL 和 service role key。", true);
  localStorage.setItem(ADMIN_URL_KEY, url);
  adminClient = window.supabase.createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  await loadFeedbackRows();
}

async function loadFeedbackRows() {
  if (!adminClient) return setAdminStatus("请先连接。", true);

  setAdminStatus("正在读取...");
  const { data, error } = await adminClient
    .from("site_feedback")
    .select("public_id, feedback_kind, feedback_text, status, developer_note, created_at, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) return setAdminStatus(error.message, true);
  feedbackRows = data || [];
  renderFeedbackRows();
  setAdminStatus(feedbackRows.length ? `已读取 ${feedbackRows.length} 条反馈。` : "暂无反馈。");
}

function renderFeedbackRows() {
  const filter = statusFilter.value;
  const rows =
    filter === "all"
      ? feedbackRows
      : feedbackRows.filter((row) => (row.status || "new") === filter);

  if (!rows.length) {
    list.innerHTML = '<article class="empty-state">当前筛选下没有反馈。</article>';
    return;
  }

  list.innerHTML = rows.map(renderFeedbackCard).join("");
}

function renderFeedbackCard(row) {
  const id = escapeHtml(row.public_id);
  const status = row.status || "new";

  return `
    <article class="message-card admin-feedback-card" data-feedback-id="${id}">
      <div class="message-topline">
        <p class="message-meta">${formatDate(row.created_at)} · ${kindLabel(row.feedback_kind)}</p>
        <span class="message-kind">${STATUS_LABELS[status] || status}</span>
      </div>
      <p class="message-body">${escapeHtml(row.feedback_text)}</p>
      <label class="toolbar-field" for="note-${id}">
        <span>整理备注</span>
        <textarea id="note-${id}" class="admin-note" maxlength="1000">${escapeHtml(row.developer_note || "")}</textarea>
      </label>
      <div class="message-actions">
        <label class="toolbar-field compact-field" for="status-${id}">
          <span>状态</span>
          <select id="status-${id}" data-action="change-status">
            ${Object.entries(STATUS_LABELS)
              .map(
                ([value, label]) =>
                  `<option value="${value}"${value === status ? " selected" : ""}>${label}</option>`
              )
              .join("")}
          </select>
        </label>
        <button class="secondary mini-button" data-action="save-note" type="button">
          保存整理
        </button>
      </div>
    </article>
  `;
}

async function handleFeedbackAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const card = button.closest("[data-feedback-id]");
  if (!card || button.dataset.action !== "save-note") return;

  const id = card.dataset.feedbackId;
  const note = card.querySelector(".admin-note").value.trim();
  const status = card.querySelector("[data-action='change-status']").value;
  await updateFeedback(id, { developer_note: note, status });
}

async function handleFeedbackStatusChange(event) {
  const select = event.target.closest("select[data-action='change-status']");
  if (!select) return;

  const card = select.closest("[data-feedback-id]");
  await updateFeedback(card.dataset.feedbackId, { status: select.value });
}

async function updateFeedback(publicId, patch) {
  if (!adminClient) return;

  const nextPatch = {
    ...patch,
    reviewed_at: patch.status && patch.status !== "new" ? new Date().toISOString() : null
  };
  const { error } = await adminClient
    .from("site_feedback")
    .update(nextPatch)
    .eq("public_id", publicId);

  if (error) return setAdminStatus(error.message, true);
  feedbackRows = feedbackRows.map((row) =>
    row.public_id === publicId ? { ...row, ...nextPatch } : row
  );
  renderFeedbackRows();
  setAdminStatus("已保存。");
}

function normalizeSupabaseUrl(value) {
  return value.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

function kindLabel(kind) {
  return {
    feedback: "使用反馈",
    problem: "遇到问题",
    idea: "一点想法",
    other: "其他"
  }[kind] || "反馈";
}

function setAdminStatus(message, isError = false) {
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
