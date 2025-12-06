/* =====================================================
   dadam.answers.js
   - 오늘의 질문 답변 저장 / 렌더링 (백엔드 연동)
   - 답변 클릭 시 모달 열기
   - 댓글(대댓글) 추가 & 동기화
===================================================== */

/* -----------------------------------------------------
   📌 DOM 요소 가져오기
----------------------------------------------------- */

const answerForm = document.getElementById("answer-form");
const answerInput = document.getElementById("answer-input");
const answerLengthHint = document.getElementById("answer-length-hint");
const answerListEl = document.getElementById("answer-list");
const answerProgressPill = document.getElementById("answer-progress-pill");

const todayQuestionEl = document.getElementById("today-question-text");

/* 답변 모달 관련 */
const answerThreadModalId = "modal-answer-thread";
const answerThreadMainEl = document.getElementById("answer-thread-main");
const commentListEl = document.getElementById("comment-list");
const commentForm = document.getElementById("comment-form");
const commentInput = document.getElementById("comment-input");

let currentThreadAnswerId = null;

/* 오늘 질문의 답변 목록 캐시 */
let todaysAnswersCache = [];

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

/* 아바타 이니셜 */
function getInitialForUser(userId, userName) {
    if (typeof DADAM_FAMILY !== "undefined" && DADAM_FAMILY[userId]) {
        return DADAM_FAMILY[userId].initial;
    }
    const base = userName || "가족";
    return base[0];
}

/* -----------------------------------------------------
   📡 백엔드 API 요청 함수
----------------------------------------------------- */
// core.js 에서 선언된 API_BASE 사용
// ex) const API_BASE = "http://localhost:8080/api/v1";

async function apiGet(url) {
    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!res.ok) {
        throw new Error(`GET ${url} 실패, status=${res.status}`);
    }
    return res.json();
}

async function apiPost(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST ${url} 실패, status=${res.status}, body=${text}`);
    }

    // 🔹 서버가 204 No Content 이거나, body가 비어있을 수도 있어서
    //    JSON 파싱이 실패해도 에러로 던지지 않고 null 리턴
    try {
        return await res.json();
    } catch (_) {
        return null;
    }
}

/* -----------------------------------------------------
   ✉️ 답변 리스트 렌더링
----------------------------------------------------- */

/* answers 배열을 받아 DOM 렌더링 */
function renderAnswerListFromData(answers) {
    if (!answerListEl) return;

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
            const initial = getInitialForUser(a.userId, a.userName);
            const likeCount = a.likeCount ?? 0;      // 서버에서 주지 않으면 0
            const commentCount = a.commentCount ?? 0; // 서버에서 주지 않으면 0

            const text = a.content || a.text || "";
            const preview =
                text.length > 70 ? text.slice(0, 70) + "..." : text;

            return `
        <li class="answer-item" data-answer-id="${a.id}">
          <button class="answer-main" type="button">
            <div class="answer-user">
              <span class="avatar avatar-sm avatar-soft">
                <span class="avatar-initial">${initial}</span>
              </span>
              <div class="answer-user-text">
                <span class="answer-name">${a.userName || "가족"}</span>
                <span class="answer-time">${formatTimeLabel(a.createdAt)}</span>
              </div>
            </div>
            <p class="answer-preview">
              ${preview}
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
    updateAnswerProgress(answers);
}

/* 참여 인원 Progress (ex: "3 / 4명 참여 중") */
function updateAnswerProgress(answers) {
    if (!answerProgressPill) return;

    const totalFamilies =
        (typeof DADAM_FAMILY !== "undefined"
            ? Object.keys(DADAM_FAMILY || {}).length
            : 4) || 4;

    const participants = new Set(
        (answers || []).map((a) => a.userId ?? a.userName ?? a.id)
    ).size;

    answerProgressPill.textContent = `${participants} / ${totalFamilies}명 참여 중`;
}

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
        console.error(err);
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

        addNotification({
            type: "info",
            message: "오늘의 질문에 답변을 남겼어요.",
        });
    } catch (err) {
        console.error(err);
        // 한 질문에 하나만 허용
        alert("답변은 하나만 등록할 수 있어요.");
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

    const initial = getInitialForUser(answer.userId, answer.userName);
    const text = answer.content || answer.text || "";

    answerThreadMainEl.innerHTML = `
    <header class="answer-user">
      <span class="avatar avatar-sm avatar-soft">
        <span class="avatar-initial">${initial}</span>
      </span>
      <div class="answer-user-text">
        <span class="answer-name">${answer.userName || "가족"}</span>
        <span class="answer-time">${formatTimeLabel(answer.createdAt)}</span>
      </div>
    </header>
    <p class="answer-thread-text">
      ${text.replace(/\n/g, "<br>")}
    </p>
  `;

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
                const initial = getInitialForUser(c.userId, displayName);
                const text = c.content || c.text || "";

                return `
          <li class="comment-item">
            <span class="avatar avatar-sm avatar-soft">
              <span class="avatar-initial">${initial}</span>
            </span>
            <div class="comment-bubble">
              <p style="font-size:13px; color:var(--fh-color-text-main);">
                <strong>${displayName}</strong>
              </p>
              <p style="font-size:13px; margin-top:2px;">
                ${text}
              </p>
              <p style="font-size:11px; margin-top:4px; color:var(--fh-color-text-softer);">
                ${formatTimeLabel(c.createdAt)}
              </p>
            </div>
          </li>
        `;
            })
            .join("");
    } catch (err) {
        console.error(err);
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
        // 🔹 여기서 서버에는 이미 저장되었을 수도 있어서
        //    굳이 알럿으로 겁주지 않고 콘솔에만 남김
        console.error("댓글 등록 중 오류(서버에는 저장되었을 수도 있음):", err);
    }

    // 🔹 어쨌든 UI는 다시 그려준다
    commentInput.value = "";
    await renderCommentList(currentThreadAnswerId);

    // 🔹 홈 화면의 댓글 수도 프론트에서 +1 (서버가 commentCount 안 줄 때 대비)
    const target = todaysAnswersCache.find(
        (a) => String(a.id) === String(currentThreadAnswerId)
    );
    if (target) {
        target.commentCount = (target.commentCount || 0) + 1;
        renderAnswerListFromData(todaysAnswersCache);
    }

    addNotification({
        type: "info",
        message: "가족의 답변에 댓글을 남겼어요.",
    });
}

/* -----------------------------------------------------
   ❤️ 좋아요(하트) 토글 (프론트 로컬 전용)
   - 백엔드 연동 전이므로, 지금은 화면에서만 숫자 토글
----------------------------------------------------- */

function toggleLikeForAnswer(answerId) {
    const item = document.querySelector(
        `.answer-item[data-answer-id="${answerId}"]`
    );
    if (!item) return;

    const countEl = item.querySelector(".like-btn .meta-count");
    if (!countEl) return;

    const current = Number(countEl.textContent || "0") || 0;
    // 간단 토글: +1 / -1
    const newCount = current === 0 ? 1 : 0;
    countEl.textContent = String(newCount);
}

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

    /* 좋아요 */
    const likeBtn = e.target.closest(".like-btn");
    if (likeBtn) {
        toggleLikeForAnswer(answerId);
        return;
    }

    /* 댓글 버튼 -> 모달 열기 */
    const commentBtn = e.target.closest(".comment-btn");
    if (commentBtn) {
        openAnswerThread(answerId);
        return;
    }

    /* 나머지는 답변 본문 클릭 -> 모달 열기 */
    const mainBtn = e.target.closest(".answer-main");
    if (mainBtn) {
        openAnswerThread(answerId);
    }
});

/* -----------------------------------------------------
   🧷 초기화
----------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    updateAnswerLengthHint();
    // 🔹 오늘의 질문 + 답변 목록 한 번에 로딩
    loadTodayQuestionAndAnswers();
});

/* -----------------------------------------------------
   📡 오늘의 질문 불러오기 + 답변 목록까지 세트로 로딩
----------------------------------------------------- */

async function loadTodayQuestionAndAnswers() {
    if (!todayQuestionEl) return;

    try {
        // 👉 오늘의 질문 API (스웨거에서 본 /api/v1/questions/today)
        const q = await apiGet(`${API_BASE}/questions/today`);

        // 응답 JSON에서 id / 내용 필드 이름이 뭐일지 몰라서 여러 후보를 순서대로 체크
        const questionId =
            q.id ??
            q.questionId ??
            q.questionID ??
            q.question_id;

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

        // 👉 여기서 dataset 에 ID를 심어줌 (핵심!)
        todayQuestionEl.dataset.questionId = String(questionId);

        // 화면의 질문 문구도 백엔드 값으로 갱신
        if (questionText) {
            todayQuestionEl.textContent = questionText;
        }

        // 질문 ID가 생겼으니, 이제 해당 질문의 답변 리스트 불러오기
        await refreshAnswerList();
    } catch (err) {
        console.error("오늘의 질문을 불러오는 중 오류:", err);
    }
}
