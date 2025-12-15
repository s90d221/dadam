/* =====================================================
   dadam.answers.js
   - 오늘의 질문 답변 저장 / 렌더링 (백엔드 연동)
   - 답변 클릭 시 모달 열기
   - 댓글(대댓글) 추가 & 동기화
   - 답변 수정 / 삭제
   - 댓글 인라인 수정 / 삭제
   - ⭐ 질문 만족도 조사(프론트 전용, 로컬 저장)
===================================================== */

/* -----------------------------------------------------
   📌 DOM 요소 가져오기
----------------------------------------------------- */

const answerForm = document.getElementById("answer-form");
const answerInput = document.getElementById("answer-input");
const answerLengthHint = document.getElementById("answer-length-hint");
const answerListEl = document.getElementById("answer-list");
const answerProgressPill = document.getElementById("answer-progress-pill");
const heroAnswerProgressEl = document.getElementById("hero-answer-progress");

const todayQuestionEl = document.getElementById("today-question-text");

/* 답변 모달 관련 */
const answerThreadModalId = "modal-answer-thread";
const answerThreadMainEl = document.getElementById("answer-thread-main");
const commentListEl = document.getElementById("comment-list");
const commentForm = document.getElementById("comment-form");
const commentInput = document.getElementById("comment-input");

/* 답변 수정/삭제 버튼 관련 */
const answerThreadActionsEl = document.getElementById("answer-thread-actions");
const answerEditBtn = document.getElementById("answer-edit-btn");
const answerEditCancelBtn = document.getElementById("answer-edit-cancel-btn");
const answerDeleteBtn = document.getElementById("answer-delete-btn");

let currentThreadAnswerId = null;
let currentThreadAnswer = null;
let isEditingThread = false;

/* 오늘 질문의 답변 목록 캐시 */
let todaysAnswersCache = [];
let latestAnswerProgressList = [];

/* 댓글 글자 수 제한 (백엔드 Comment.MAX_COMMENT_LENGTH = 50) */
const COMMENT_MAX_LENGTH = 50;

/* 질문 만족도 메모리 캐시 */
const QUESTION_RATING_KEY = "dadam_question_rating";
let questionRatingMap = {};

/* -----------------------------------------------------
   🧩 헬퍼 함수
----------------------------------------------------- */

/* 오늘 질문 ID 가져오기 */
function getCurrentQuestionId() {
    if (!todayQuestionEl) return null;
    const raw = todayQuestionEl.dataset.questionId;
    if (!raw) return null;
    return raw; // 필요하면 Number(raw)로 바꿔도 됨
}

/* 상대적 시간 간단 표시 (오늘 기준) */
function formatTimeLabel(timestamp) {
    if (!timestamp) return "오늘";
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return "오늘";

    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `오늘 · ${hh}:${mm}`;
}

/* 아바타 표시용 이름 (DADAM_FAMILY 있으면 우선 사용) */
function getDisplayNameForUser(userId, userName) {
    if (typeof DADAM_FAMILY !== "undefined" && DADAM_FAMILY[userId]) {
        return (
            DADAM_FAMILY[userId].name ||
            DADAM_FAMILY[userId].initial ||
            "가족"
        );
    }
    return userName || "가족";
}

/* 간단 XSS 방지용 이스케이프 */
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* 현재 유저의 답변인지 여부 */
function isMyAnswer(answer) {
    if (!answer) return false;

    // ⚠ currentUser 구조에 맞게 필요하면 수정
    if (typeof currentUser !== "undefined" && currentUser && currentUser.id != null) {
        return String(answer.userId) === String(currentUser.id);
    }

    if (typeof currentUser !== "undefined" && currentUser && currentUser.name) {
        return answer.userName === currentUser.name;
    }

    return false;
}

/* 현재 유저의 댓글인지 여부 */
function isMyComment(comment) {
    if (!comment) return false;

    if (typeof currentUser !== "undefined" && currentUser && currentUser.id != null) {
        return String(comment.userId) === String(currentUser.id);
    }

    if (typeof currentUser !== "undefined" && currentUser && currentUser.name) {
        return comment.userName === currentUser.name;
    }

    return false;
}

/* -----------------------------------------------------
   📡 공통 fetch 헬퍼 (토큰 포함)
----------------------------------------------------- */

async function apiGet(url) {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
        },
    });

    if (res.status === 401) {
        if (typeof setAuthUiState === "function") {
            setAuthUiState(false);
        }
        throw new Error("GET 401 Unauthorized");
    }

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`GET ${url} 실패, status=${res.status}, body=${txt}`);
    }

    return res.json();
}

async function apiPost(url, body) {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(body),
    });

    if (res.status === 401) {
        if (typeof setAuthUiState === "function") {
            setAuthUiState(false);
        }
        throw new Error("POST 401 Unauthorized");
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST ${url} 실패, status=${res.status}, body=${text}`);
    }

    try {
        return await res.json();
    } catch (_) {
        return null;
    }
}

/* ✅ PATCH (답변 수정에 사용) */
async function apiPatch(url, body) {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;

    const res = await fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(body),
    });

    if (res.status === 401) {
        if (typeof setAuthUiState === "function") {
            setAuthUiState(false);
        }
        throw new Error("PATCH 401 Unauthorized");
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`PATCH ${url} 실패, status=${res.status}, body=${text}`);
    }

    try {
        return await res.json();
    } catch (_) {
        return null;
    }
}

/* ✅ PUT (댓글 수정에 사용) */
async function apiPut(url, body) {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(body),
    });

    if (res.status === 401) {
        if (typeof setAuthUiState === "function") {
            setAuthUiState(false);
        }
        throw new Error("PUT 401 Unauthorized");
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`PUT ${url} 실패, status=${res.status}, body=${text}`);
    }

    try {
        return await res.json();
    } catch (_) {
        return null;
    }
}

/* ✅ DELETE (답변/댓글 삭제) */
async function apiDelete(url) {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;

    const res = await fetch(url, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
        },
    });

    if (res.status === 401) {
        if (typeof setAuthUiState === "function") {
            setAuthUiState(false);
        }
        throw new Error("DELETE 401 Unauthorized");
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`DELETE ${url} 실패, status=${res.status}, body=${text}`);
    }

    return null;
}

/* -----------------------------------------------------
   ✉️ 답변 리스트 렌더링
----------------------------------------------------- */

function renderAnswerListFromData(answers) {
    if (!answerListEl) return;

    latestAnswerProgressList = answers || [];

    if (!answers || answers.length === 0) {
        answerListEl.innerHTML = `
      <li class="answer-item">
        <div class="answer-main">
          <p class="text-soft" style="font-size:14px;">
            아직 올라온 답변이 없어요. 첫 번째로 가족에게 마음을 나눠볼까요? 💛
          </p>
        </div>
      </li>
    `;
        updateAnswerProgress([]);
        return;
    }

    const html = answers
        .map((a) => {
            const displayName = getDisplayNameForUser(a.userId, a.userName);
            const avatarLabel =
                typeof getAvatarLabel === "function"
                    ? getAvatarLabel(displayName)
                    : displayName;
            const likeCount = a.likeCount ?? 0;
            const commentCount = a.commentCount ?? 0;

            const text = a.content || a.text || "";
            const preview =
                text.length > 70 ? text.slice(0, 70) + "..." : text;

            return `
        <li class="answer-item" data-answer-id="${a.id}">
          <button class="answer-main" type="button">
            <div class="answer-user">
              <span class="avatar avatar-sm avatar-soft">
                <span class="avatar-initial">${avatarLabel}</span>
              </span>
              <div class="answer-user-text">
                <span class="answer-name">${escapeHtml(displayName)}</span>
                <span class="answer-time">${formatTimeLabel(a.createdAt)}</span>
              </div>
            </div>
            <p class="answer-preview">
              ${escapeHtml(preview)}
            </p>
          </button>
          <div class="answer-meta">
            <button class="meta-btn like-btn" type="button">
              <span class="fh-icon-heart"></span>
              <span class="meta-count">${likeCount}</span>
            </button>
            <button class="meta-btn comment-btn" type="button">
              <span class="fh-icon-comment"></span>
              <span class="meta-count">${commentCount}</span>
            </button>
          </div>
        </li>
      `;
        })
        .join("");

    answerListEl.innerHTML = html;
    updateAnswerProgress(latestAnswerProgressList);
}

/* 참여 인원 Progress (ex: "3 / 4명 참여 중") */
function updateAnswerProgress(answers) {
    if (!answerProgressPill) return;

    const totalFamiliesFromGlobal =
        typeof window.DADAM_FAMILY_COUNT === "number"
            ? window.DADAM_FAMILY_COUNT
            : typeof DADAM_FAMILY !== "undefined"
              ? Object.keys(DADAM_FAMILY || {}).length
              : 0;

    const participants = new Set(
        (answers || []).map((a) => a.userId ?? a.userName ?? a.id)
    ).size;

    const totalFamilies =
        totalFamiliesFromGlobal > 0
            ? totalFamiliesFromGlobal
            : Math.max(participants, 1);

    const progressText = `${participants} / ${totalFamilies}명 참여 중`;
    answerProgressPill.textContent = progressText;

    if (heroAnswerProgressEl) {
        heroAnswerProgressEl.textContent = progressText;
    }
}

window.refreshAnswerProgressWithCurrentFamily = function () {
    updateAnswerProgress(latestAnswerProgressList);
};

/* 오늘 질문 기준으로 답변 목록을 불러와 렌더링 */
async function refreshAnswerList() {
    if (!answerListEl) return;

    const questionId = getCurrentQuestionId();
    if (!questionId) {
        console.warn("질문 ID가 없어 답변 목록을 불러올 수 없어요.");
        answerListEl.innerHTML = `
      <li class="answer-item">
        <div class="answer-main">
          <p class="text-soft" style="font-size:14px;">
            오늘의 질문 정보를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.
          </p>
        </div>
      </li>
    `;
        return;
    }

    try {
        const data = await apiGet(`${API_BASE}/questions/${questionId}/answers`);
        const answers = Array.isArray(data) ? data : [];
        todaysAnswersCache = answers;
        renderAnswerListFromData(answers);
    } catch (err) {
        console.error("[ANSWERS] list error:", err);
        answerListEl.innerHTML = `
      <li class="answer-item">
        <div class="answer-main">
          <p class="text-soft" style="font-size:14px;">
            답변 목록을 불러오는 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.
          </p>
        </div>
      </li>
    `;
    }
}

/* -----------------------------------------------------
   ✨ 답변 추가 로직
----------------------------------------------------- */

async function handleAnswerSubmit(e) {
    e?.preventDefault?.();
    if (!answerInput) return;

    const text = answerInput.value.trim();
    if (!text) return;

    const questionId = getCurrentQuestionId();
    if (!questionId) {
        alert("오늘의 질문 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
    }

    try {
        await apiPost(`${API_BASE}/questions/${questionId}/answers`, {
            content: text,
        });

        answerInput.value = "";
        updateAnswerLengthHint();
        await refreshAnswerList();

        addNotification?.({
            type: "info",
            message: "오늘의 질문에 답변을 남겼어요.",
        });
    } catch (err) {
        console.error("[ANSWERS] submit error:", err);

        const msg = err.message || "";

        // 1) JWT 인증 실패
        if (msg.includes("401") || msg.includes("Unauthorized")) {
            alert("로그인이 필요해요. 먼저 로그인해 주세요.");
            return;
        }

        // 2) 중복 답변
        if (msg.includes("이미 답변을 작성했습니다") || msg.includes("ALREADY_ANSWERED")) {
            alert("이미 오늘의 질문에 답변을 남기셨어요! 내일 새로운 질문을 기다려 주세요 :)");
            return;
        }

        // 3) 기타 오류
        alert("답변 등록 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    }
}

/* 글자 수 표시 */
function updateAnswerLengthHint() {
    if (!answerInput || !answerLengthHint) return;
    const raw = answerInput.value || "";
    if (raw.length > 500) {
        answerInput.value = raw.slice(0, 500);
    }
    const len = answerInput.value.length;
    answerLengthHint.textContent = `${len} / 500`;
}

/* -----------------------------------------------------
   💬 답변 모달 열기 & 댓글 렌더링
----------------------------------------------------- */

function openAnswerThread(answerId) {
    const answer =
        todaysAnswersCache.find((a) => String(a.id) === String(answerId)) ||
        null;
    if (!answer || !answerThreadMainEl) return;

    currentThreadAnswerId = answerId;
    currentThreadAnswer = answer;
    isEditingThread = false;

    const displayName = getDisplayNameForUser(answer.userId, answer.userName);
    const avatarLabel =
        typeof getAvatarLabel === "function"
            ? getAvatarLabel(displayName)
            : displayName;
    const text = answer.content || answer.text || "";

    answerThreadMainEl.innerHTML = `
    <header class="answer-user">
      <span class="avatar avatar-sm avatar-soft">
        <span class="avatar-initial">${avatarLabel}</span>
      </span>
      <div class="answer-user-text">
        <span class="answer-name">${escapeHtml(displayName)}</span>
        <span class="answer-time">${formatTimeLabel(answer.createdAt)}</span>
      </div>
    </header>
    <p class="answer-thread-text" id="answer-thread-text">
      ${escapeHtml(text).replace(/\n/g, "<br>")}
    </p>
 `;

    // ✅ 내 답변일 때만 수정/삭제 버튼 노출
    if (answerThreadActionsEl) {
        if (isMyAnswer(answer)) {
            answerThreadActionsEl.style.display = "flex";
            if (answerEditBtn) {
                answerEditBtn.style.display = "inline-flex";
                answerEditBtn.textContent = "수정";
            }
            if (answerEditCancelBtn) {
                answerEditCancelBtn.style.display = "none";
            }
        } else {
            answerThreadActionsEl.style.display = "none";
        }
    }

    renderCommentList(answerId);
    openModal(answerThreadModalId);
}

/* 댓글 리스트 렌더링 (백엔드에서 가져오기) */
async function renderCommentList(answerId) {
    if (!commentListEl) return;

    try {
        const data = await apiGet(`${API_BASE}/answers/${answerId}/comments`);
        const comments = Array.isArray(data) ? data : [];

        if (comments.length === 0) {
            commentListEl.innerHTML = `
        <li class="comment-item">
          <div class="comment-bubble text-soft" style="font-size:13px;">
            아직 댓글이 없어요. 따뜻한 한마디를 남겨볼까요? 🌷
          </div>
        </li>
      `;
            return;
        }

        commentListEl.innerHTML = comments
            .map((c) => {
                const displayName =
                    c.userName ||
                    (typeof currentUser !== "undefined" && currentUser.name) ||
                    "가족";
                const avatarLabel =
                    typeof getAvatarLabel === "function"
                        ? getAvatarLabel(displayName)
                        : displayName;
                const text = c.content || c.text || "";
                const mine = isMyComment(c);

                return `
          <li class="comment-item" data-comment-id="${c.commentId}" data-answer-id="${answerId}">
            <span class="avatar avatar-sm avatar-soft">
              <span class="avatar-initial">${avatarLabel}</span>
            </span>
            <div class="comment-bubble">
              <p style="font-size:13px; color:var(--fh-color-text-main);">
                <strong>${escapeHtml(displayName)}</strong>
              </p>
              <p class="comment-text" style="font-size:13px; margin-top:2px;">
                ${escapeHtml(text)}
              </p>
              <div class="comment-footer">
                <p class="comment-time" style="font-size:11px; margin-top:4px; color:var(--fh-color-text-softer);">
                  ${formatTimeLabel(c.createdAt)}
                </p>
                ${
                    mine
                        ? `
                <div class="comment-actions">
                  <button type="button" class="link-button comment-edit-btn">수정</button>
                  <button type="button" class="link-button comment-delete-btn">삭제</button>
                </div>
                `
                        : ""
                }
              </div>
            </div>
          </li>
        `;
            })
            .join("");
    } catch (err) {
        console.error("[COMMENTS] list error:", err);
        commentListEl.innerHTML = `
      <li class="comment-item">
        <div class="comment-bubble text-soft" style="font-size:13px;">
          댓글을 불러오는 중 오류가 발생했어요.
        </div>
      </li>
    `;
    }
}

/* 댓글 추가 */
async function handleCommentSubmit(e) {
    e?.preventDefault?.();
    if (!commentInput || !currentThreadAnswerId) return;

    const text = commentInput.value.trim();
    if (!text) return;

    try {
        await apiPost(
            `${API_BASE}/answers/${currentThreadAnswerId}/comments`,
            { content: text }
        );
    } catch (err) {
        console.error("댓글 등록 중 오류:", err);
    }

    commentInput.value = "";
    await renderCommentList(currentThreadAnswerId);

    const target = todaysAnswersCache.find(
        (a) => String(a.id) === String(currentThreadAnswerId)
    );
    if (target) {
        target.commentCount = (target.commentCount || 0) + 1;
        renderAnswerListFromData(todaysAnswersCache);
    }

    const voterName =
        (typeof currentUser !== "undefined" &&
            currentUser &&
            currentUser.name) ||
        "나";

    addNotification?.({
        type: "info",
        message: `${voterName}님이 가족의 답변에 댓글을 남겼어요.`,
    });
}

/* -----------------------------------------------------
   📝 댓글 인라인 수정 / 삭제
----------------------------------------------------- */

function enterCommentEditMode(liEl) {
    if (!liEl) return;
    if (liEl.dataset.editing === "true") return;

    const textEl = liEl.querySelector(".comment-text");
    if (!textEl) return;

    // 화면에 보이는 텍스트 기준으로 공백 제거
    const original = (textEl.textContent || "").trim();
    liEl.dataset.editing = "true";

    // textarea 래퍼
    const wrapper = document.createElement("div");
    wrapper.className = "comment-edit-wrapper";

    const textarea = document.createElement("textarea");
    textarea.className = "textarea comment-edit-input";
    textarea.rows = 2;
    textarea.value = original; // 공백 제외한 실제 내용만

    const hint = document.createElement("p");
    hint.className = "comment-edit-length";
    hint.style.fontSize = "11px";
    hint.style.textAlign = "right";
    hint.style.marginTop = "4px";
    hint.textContent = `${original.length} / ${COMMENT_MAX_LENGTH}`;

    wrapper.appendChild(textarea);
    wrapper.appendChild(hint);

    // 기존 p.comment-text 대신 wrapper로 교체
    textEl.replaceWith(wrapper);

    const editBtn = liEl.querySelector(".comment-edit-btn");
    const deleteBtn = liEl.querySelector(".comment-delete-btn");

    if (editBtn) {
        editBtn.textContent = "저장";
    }
    if (deleteBtn) {
        deleteBtn.textContent = "취소";
        deleteBtn.classList.add("comment-edit-cancel-btn");
    }

    textarea.focus();

    textarea.addEventListener("input", () => {
        let v = textarea.value || "";
        if (v.length > COMMENT_MAX_LENGTH) {
            v = v.slice(0, COMMENT_MAX_LENGTH);
            textarea.value = v;
        }
        hint.textContent = `${v.length} / ${COMMENT_MAX_LENGTH}`;
    });
}

/* 댓글 수정 저장 */
async function saveCommentEdit(answerId, commentId, liEl) {
    const textarea = liEl.querySelector(".comment-edit-input");
    if (!textarea) return;

    const newText = textarea.value.trim();
    if (!newText) {
        alert("내용을 입력해 주세요.");
        return;
    }

    if (newText.length > COMMENT_MAX_LENGTH) {
        alert(`댓글은 최대 ${COMMENT_MAX_LENGTH}자까지 작성할 수 있어요.`);
        return;
    }

    try {
        await apiPut(
            `${API_BASE}/answers/${answerId}/comments/${commentId}`,
            { content: newText }
        );

        // 수정 완료 후 다시 리스트 렌더링
        await renderCommentList(answerId);

        addNotification?.({
            type: "info",
            message: "댓글을 수정했어요.",
        });
    } catch (err) {
        console.error("[COMMENTS] update error:", err);
        const msg = err.message || "";

        if (msg.includes("401") || msg.includes("Unauthorized")) {
            alert("로그인이 필요해요. 먼저 로그인해 주세요.");
            return;
        }

        if (msg.includes("최대") || msg.includes("50자를 초과")) {
            alert(`댓글은 최대 ${COMMENT_MAX_LENGTH}자까지 작성할 수 있어요.`);
            return;
        }

        alert("댓글 수정 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    }
}

/* 댓글 삭제 (내 댓글만) */
async function handleCommentDelete(answerId, commentId) {
    const ok = window.confirm("이 댓글을 삭제할까요?");
    if (!ok) return;

    try {
        await apiDelete(
            `${API_BASE}/answers/${answerId}/comments/${commentId}`
        );

        await renderCommentList(answerId);

        // 상단 답변 카드의 댓글 개수 감소
        const target = todaysAnswersCache.find(
            (a) => String(a.id) === String(answerId)
        );
        if (target && target.commentCount != null) {
            target.commentCount = Math.max(
                0,
                (target.commentCount || 0) - 1
            );
            renderAnswerListFromData(todaysAnswersCache);
        }

        addNotification?.({
            type: "info",
            message: "댓글을 삭제했어요.",
        });
    } catch (err) {
        console.error("[COMMENTS] delete error:", err);
        const msg = err.message || "";

        if (msg.includes("401") || msg.includes("Unauthorized")) {
            alert("로그인이 필요해요. 먼저 로그인해 주세요.");
            return;
        }

        alert("댓글 삭제 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    }
}

/* -----------------------------------------------------
   ✏️ 답변 수정 모드 / 저장 / 취소
----------------------------------------------------- */

function enterEditModeForThread() {
    if (!answerThreadMainEl || !currentThreadAnswer) return;

    const originalText = (currentThreadAnswer.content || currentThreadAnswer.text || "").trim();
    const textContainer = answerThreadMainEl.querySelector("#answer-thread-text");
    if (!textContainer) return;

    isEditingThread = true;

    // 기존 내용 제거
    textContainer.innerHTML = "";

    // textarea 직접 생성해서 값 세팅 (템플릿 문자열 안에 안 넣음)
    const textarea = document.createElement("textarea");
    textarea.id = "answer-thread-edit-input";
    textarea.className = "textarea";
    textarea.rows = 4;
    textarea.style.marginTop = "8px";
    textarea.value = originalText; // 공백 없이 실제 내용만

    const hint = document.createElement("p");
    hint.id = "answer-thread-edit-length";
    hint.className = "length-hint";
    hint.style.textAlign = "right";
    hint.style.fontSize = "12px";
    hint.style.marginTop = "4px";
    hint.textContent = `${originalText.length} / 500`;

    textContainer.appendChild(textarea);
    textContainer.appendChild(hint);

    if (answerEditBtn) {
        answerEditBtn.textContent = "수정 완료";
    }
    if (answerEditCancelBtn) {
        answerEditCancelBtn.style.display = "inline-flex";
    }

    textarea.focus();

    textarea.addEventListener("input", () => {
        let val = textarea.value || "";
        if (val.length > 500) {
            val = val.slice(0, 500);
            textarea.value = val;
        }
        hint.textContent = `${val.length} / 500`;
    });
}

function cancelEditModeForThread() {
    if (!currentThreadAnswerId) return;
    isEditingThread = false;
    openAnswerThread(currentThreadAnswerId);
}

/* 수정 내용 저장 (답변) */
async function saveEditedThreadAnswer() {
    if (!currentThreadAnswerId) return;

    const questionId = getCurrentQuestionId();
    if (!questionId) {
        alert("오늘의 질문 정보를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.");
        return;
    }

    const editInput = document.getElementById("answer-thread-edit-input");
    if (!editInput) return;

    const newText = editInput.value.trim();
    if (!newText) {
        alert("내용을 입력해 주세요.");
        return;
    }

    try {
        await apiPatch(
            `${API_BASE}/questions/${questionId}/answers/${currentThreadAnswerId}`,
            { content: newText }
        );

        // 로컬 캐시 업데이트
        const target = todaysAnswersCache.find(
            (a) => String(a.id) === String(currentThreadAnswerId)
        );
        if (target) {
            target.content = newText;
        }

        isEditingThread = false;

        // 모달 내용 + 리스트 모두 최신화
        openAnswerThread(currentThreadAnswerId);
        await refreshAnswerList();

        addNotification?.({
            type: "info",
            message: "답변을 수정했어요.",
        });
    } catch (err) {
        console.error("[ANSWERS] update error:", err);
        const msg = err.message || "";

        if (msg.includes("401") || msg.includes("Unauthorized")) {
            alert("로그인이 필요해요. 먼저 로그인해 주세요.");
            return;
        }

        alert("답변 수정 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    }
}

/* -----------------------------------------------------
   🗑️ 답변 삭제
----------------------------------------------------- */

async function deleteThreadAnswer() {
    if (!currentThreadAnswerId) return;

    const questionId = getCurrentQuestionId();
    if (!questionId) {
        alert("오늘의 질문 정보를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.");
        return;
    }

    const ok = confirm("정말 이 답변을 삭제할까요?");
    if (!ok) return;

    try {
        await apiDelete(
            `${API_BASE}/questions/${questionId}/answers/${currentThreadAnswerId}`
        );

        // 캐시에서 제거
        todaysAnswersCache = todaysAnswersCache.filter(
            (a) => String(a.id) !== String(currentThreadAnswerId)
        );
        await refreshAnswerList();

        addNotification?.({
            type: "info",
            message: "답변을 삭제했어요.",
        });

        currentThreadAnswerId = null;
        currentThreadAnswer = null;
        isEditingThread = false;

        if (typeof closeModal === "function") {
            closeModal(answerThreadModalId);
        } else {
            const modalEl = document.getElementById(answerThreadModalId);
            modalEl?.classList.remove("is-open");
        }
    } catch (err) {
        console.error("[ANSWERS] delete error:", err);
        const msg = err.message || "";

        if (msg.includes("401") || msg.includes("Unauthorized")) {
            alert("로그인이 필요해요. 먼저 로그인해 주세요.");
            return;
        }

        alert("답변 삭제 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    }
}

/* -----------------------------------------------------
   ❤️ 좋아요(하트) 토글 (프론트 로컬 전용, 개별 답변용)
----------------------------------------------------- */

function toggleLikeForAnswer(answerId) {
    const item = document.querySelector(
        `.answer-item[data-answer-id="${answerId}"]`
    );
    if (!item) return;

    const countEl = item.querySelector(".like-btn .meta-count");
    if (!countEl) return;

    const current = Number(countEl.textContent || "0") || 0;
    const newCount = current === 0 ? 1 : 0;
    countEl.textContent = String(newCount);
}

/* -----------------------------------------------------
   ⭐ 질문 만족도 조사 (프론트 전용, 로컬 저장)
----------------------------------------------------- */

/* 메모리에서 질문별 만족도 데이터 로드 */
function loadQuestionRatingMap() {
    return { ...questionRatingMap };
}

/* 메모리에 질문별 만족도 데이터 저장 */
function saveQuestionRatingMap(map) {
    questionRatingMap = { ...map };
}

/* 현재 질문에 대해 저장된 만족도 값을 UI에 반영 */
function applySavedQuestionRating() {
    const buttons = document.querySelectorAll(".question-rating-btn");
    if (!buttons.length) return;

    const questionId = getCurrentQuestionId();
    if (!questionId) return;

    const map = loadQuestionRatingMap();
    const savedRating = map[questionId];
    if (!savedRating) {
        // 저장된 값이 없으면 모두 선택 해제
        buttons.forEach((b) => b.classList.remove("is-selected"));
        return;
    }

    buttons.forEach((btn) => {
        const rating = btn.dataset.rating;
        if (rating === savedRating) {
            btn.classList.add("is-selected");
        } else {
            btn.classList.remove("is-selected");
        }
    });
}

/* 질문 만족도 버튼 초기화 */
function initQuestionRating() {
    const buttons = document.querySelectorAll(".question-rating-btn");
    if (!buttons.length) return;

    // 최초 진입 시, 이미 서버 렌더링으로 questionId가 있다면 바로 반영
    applySavedQuestionRating();

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const questionId = getCurrentQuestionId() || "default";
            const rating = btn.dataset.rating;
            if (!rating) return;

            // 선택 상태 UI 반영
            buttons.forEach((b) => b.classList.remove("is-selected"));
            btn.classList.add("is-selected");

            // 로컬스토리지에 저장
            const map = loadQuestionRatingMap();
            map[questionId] = rating;
            saveQuestionRatingMap(map);
        });
    });
}

window.clearAnswerSession = function () {
    questionRatingMap = {};
    todaysAnswersCache = [];
    latestAnswerProgressList = [];
};

/* -----------------------------------------------------
   🎯 이벤트 리스너 등록
----------------------------------------------------- */

/* 답변 제출 */
answerForm?.addEventListener("submit", (e) => {
    handleAnswerSubmit(e);
});

/* 글자 수 실시간 표시 */
answerInput?.addEventListener("input", updateAnswerLengthHint);

/* 댓글 제출 */
commentForm?.addEventListener("submit", (e) => {
    handleCommentSubmit(e);
});

/* 답변 아이템 클릭 / 좋아요 / 댓글 버튼 (이벤트 위임) */
document.addEventListener("click", (e) => {
    const answerItem = e.target.closest(".answer-item");
    if (!answerItem) return;
    const answerId = answerItem.dataset.answerId;
    if (!answerId) return;

    const likeBtn = e.target.closest(".like-btn");
    if (likeBtn) {
        toggleLikeForAnswer(answerId);
        return;
    }

    const commentBtn = e.target.closest(".comment-btn");
    if (commentBtn) {
        openAnswerThread(answerId);
        return;
    }

    const mainBtn = e.target.closest(".answer-main");
    if (mainBtn) {
        openAnswerThread(answerId);
    }
});

/* ✅ 모달 내 답변 수정 / 취소 / 삭제 버튼 */
answerEditBtn?.addEventListener("click", () => {
    if (!currentThreadAnswerId || !currentThreadAnswer) return;

    if (!isEditingThread) {
        // 수정 모드 진입
        enterEditModeForThread();
    } else {
        // 수정 완료 (저장)
        saveEditedThreadAnswer();
    }
});

answerEditCancelBtn?.addEventListener("click", () => {
    if (!isEditingThread) return;
    cancelEditModeForThread();
});

answerDeleteBtn?.addEventListener("click", () => {
    deleteThreadAnswer();
});

/* ✅ 댓글 목록 안에서 수정/삭제 버튼 클릭 (이벤트 위임) */
commentListEl?.addEventListener("click", (e) => {
    const li = e.target.closest(".comment-item");
    if (!li) return;

    const commentId = li.dataset.commentId;
    const answerId = li.dataset.answerId || currentThreadAnswerId;
    if (!commentId || !answerId) return;

    const editBtn = e.target.closest(".comment-edit-btn");
    const deleteBtn = e.target.closest(".comment-delete-btn");

    // 수정 버튼
    if (editBtn) {
        if (li.dataset.editing === "true") {
            // 이미 수정모드 → 저장
            saveCommentEdit(answerId, commentId, li);
        } else {
            // 수정모드 진입
            enterCommentEditMode(li);
        }
        return;
    }

    // 삭제 / 취소 버튼
    if (deleteBtn) {
        if (deleteBtn.classList.contains("comment-edit-cancel-btn")) {
            // 수정 취소 → 다시 렌더링해서 원상복구
            li.dataset.editing = "false";
            renderCommentList(answerId);
        } else {
            // 실제 삭제
            handleCommentDelete(answerId, commentId);
        }
    }
});

/* -----------------------------------------------------
   🧷 초기화
----------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    updateAnswerLengthHint();
    loadTodayQuestionAndAnswers();
    initQuestionRating(); // 질문 만족도 버튼 초기화
});

/* -----------------------------------------------------
   📡 오늘의 질문 불러오기 + 답변 목록까지 세트로 로딩
----------------------------------------------------- */

async function loadTodayQuestionAndAnswers() {
    if (!todayQuestionEl) return;

    try {
        const q = await apiGet(`${API_BASE}/questions/today`);

        const questionId =
            q.id ?? q.questionId ?? q.questionID ?? q.question_id;

        const questionText =
            q.content ??
            q.question ??
            q.text ??
            q.title ??
            todayQuestionEl.textContent;

        if (!questionId) {
            console.warn("오늘의 질문 ID를 응답에서 찾지 못했어요.", q);
            return;
        }

        todayQuestionEl.dataset.questionId = String(questionId);

        if (questionText) {
            todayQuestionEl.textContent = questionText;
        }

        // 질문 ID가 확정된 뒤, 저장된 만족도 상태 다시 반영
        applySavedQuestionRating();

        await refreshAnswerList();
    } catch (err) {
        console.error("오늘의 질문을 불러오는 중 오류:", err);
    }
}
