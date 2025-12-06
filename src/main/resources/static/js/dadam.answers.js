/* =====================================================
   dadam.answers.js
   - 오늘의 질문 답변 저장 / 렌더링
   - 답변 클릭 시 모달 열기
   - 대댓글(답글) 추가 & 동기화
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

/* -----------------------------------------------------
   🧩 헬퍼 함수
----------------------------------------------------- */

/* 오늘 질문 ID 가져오기 (data-question-id 없으면 기본값) */
function getCurrentQuestionId() {
    if (!todayQuestionEl) return "q-default";
    return todayQuestionEl.dataset.questionId || "q-default";
}

/* 전체 답변 구조:
   {
     [questionId]: Answer[]
   }
   Answer:
   {
     id, userId, userName,
     text, createdAt, likes: [userId]
   }
*/
function loadAnswersForToday() {
    const qid = getCurrentQuestionId();
    const all = load(DADAM_KEYS.ANSWERS, {});
    return all[qid] || [];
}

function saveAnswersForToday(list) {
    const qid = getCurrentQuestionId();
    const all = load(DADAM_KEYS.ANSWERS, {});
    all[qid] = list;
    save(DADAM_KEYS.ANSWERS, all);
}

/* 댓글 구조:
   {
     [answerId]: Comment[]
   }
   Comment:
   {
     id, userId, userName,
     text, createdAt
   }
*/
function loadCommentsForAnswer(answerId) {
    const all = load(DADAM_KEYS.COMMENTS, {});
    return all[answerId] || [];
}

function saveCommentsForAnswer(answerId, list) {
    const all = load(DADAM_KEYS.COMMENTS, {});
    all[answerId] = list;
    save(DADAM_KEYS.COMMENTS, all);
}

/* 상대적 시간 간단 표시 (오늘 기준) */
function formatTimeLabel(timestamp) {
    const d = new Date(timestamp);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `오늘 · ${hh}:${mm}`;
}

/* 아바타 이니셜 */
function getInitialForUser(userId, userName) {
    if (DADAM_FAMILY[userId]) return DADAM_FAMILY[userId].initial;
    return (userName || "가족")[0];
}

/* -----------------------------------------------------
   ✉️ 답변 리스트 렌더링
----------------------------------------------------- */

function renderAnswerList() {
    if (!answerListEl) return;

    const answers = loadAnswersForToday();

    if (answers.length === 0) {
        answerListEl.innerHTML = `
      <li class="answer-item">
        <div class="answer-main">
          <p class="text-soft" style="font-size:14px;">
            아직 올라온 답변이 없어요. 첫 번째로 가족에게 마음을 나눠볼까요? 💛
          </p>
        </div>
      </li>
    `;
        updateAnswerProgress(0);
        return;
    }

    const html = answers
        .map((a) => {
            const initial = getInitialForUser(a.userId, a.userName);
            const likeCount = (a.likes || []).length;
            const commentCount = loadCommentsForAnswer(a.id).length;
            const preview =
                a.text.length > 70 ? a.text.slice(0, 70) + "..." : a.text;

            return `
        <li class="answer-item" data-answer-id="${a.id}">
          <button class="answer-main" type="button">
            <div class="answer-user">
              <span class="avatar avatar-sm avatar-soft">
                <span class="avatar-initial">${initial}</span>
              </span>
              <div class="answer-user-text">
                <span class="answer-name">${a.userName}</span>
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
    updateAnswerProgress(answers.length);
}

/* 참여 인원 Progress (ex: "3 / 4명 참여 중") */
function updateAnswerProgress(answerCount) {
    if (!answerProgressPill) return;
    const total = Object.keys(DADAM_FAMILY || {}).length || 4;
    const uniqueParticipants = new Set(
        loadAnswersForToday().map((a) => a.userId)
    ).size;

    const current = Math.max(uniqueParticipants, answerCount);
    answerProgressPill.textContent = `${current} / ${total}명 참여 중`;
}

/* -----------------------------------------------------
   ✨ 답변 추가 로직
----------------------------------------------------- */

function handleAnswerSubmit(e) {
    e?.preventDefault?.();
    if (!answerInput) return;

    const text = answerInput.value.trim();
    if (!text) return;

    const newAnswer = {
        id: Date.now().toString(),
        userId: "me", // 실제 서비스에서는 로그인 유저 ID
        userName: currentUser.name || "나",
        text,
        createdAt: Date.now(),
        likes: [],
    };

    const list = loadAnswersForToday();
    list.unshift(newAnswer);
    saveAnswersForToday(list);

    answerInput.value = "";
    updateAnswerLengthHint();
    renderAnswerList();

    addNotification({
        type: "info",
        message: "오늘의 질문에 답변을 남겼어요.",
    });
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
   💬 답변 모달 열기 & 렌더링
----------------------------------------------------- */

function openAnswerThread(answerId) {
    const answers = loadAnswersForToday();
    const answer = answers.find((a) => a.id === answerId);
    if (!answer || !answerThreadMainEl) return;

    currentThreadAnswerId = answerId;

    const initial = getInitialForUser(answer.userId, answer.userName);

    answerThreadMainEl.innerHTML = `
    <header class="answer-user">
      <span class="avatar avatar-sm avatar-soft">
        <span class="avatar-initial">${initial}</span>
      </span>
      <div class="answer-user-text">
        <span class="answer-name">${answer.userName}</span>
        <span class="answer-time">${formatTimeLabel(answer.createdAt)}</span>
      </div>
    </header>
    <p class="answer-thread-text">
      ${answer.text.replace(/\n/g, "<br>")}
    </p>
  `;

    renderCommentList(answerId);
    openModal(answerThreadModalId);
}

/* 댓글 리스트 렌더링 */
function renderCommentList(answerId) {
    if (!commentListEl) return;
    const comments = loadCommentsForAnswer(answerId);

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
            const initial = getInitialForUser(c.userId, c.userName);
            return `
        <li class="comment-item">
          <span class="avatar avatar-sm avatar-soft">
            <span class="avatar-initial">${initial}</span>
          </span>
          <div class="comment-bubble">
            <p style="font-size:13px; color:var(--fh-color-text-main);">
              <strong>${c.userName}</strong>
            </p>
            <p style="font-size:13px; margin-top:2px;">
              ${c.text}
            </p>
            <p style="font-size:11px; margin-top:4px; color:var(--fh-color-text-softer);">
              ${formatTimeLabel(c.createdAt)}
            </p>
          </div>
        </li>
      `;
        })
        .join("");
}

/* 댓글 추가 */
function handleCommentSubmit(e) {
    e?.preventDefault?.();
    if (!commentInput || !currentThreadAnswerId) return;

    const text = commentInput.value.trim();
    if (!text) return;

    const newComment = {
        id: Date.now().toString(),
        userId: "me",
        userName: currentUser.name || "나",
        text,
        createdAt: Date.now(),
    };

    const list = loadCommentsForAnswer(currentThreadAnswerId);
    list.push(newComment);
    saveCommentsForAnswer(currentThreadAnswerId, list);

    commentInput.value = "";
    renderCommentList(currentThreadAnswerId);

    /* 리스트의 댓글 수도 업데이트 */
    renderAnswerList();

    addNotification({
        type: "info",
        message: "가족의 답변에 댓글을 남겼어요.",
    });
}

/* -----------------------------------------------------
   ❤️ 좋아요(하트) 토글
----------------------------------------------------- */

function toggleLikeForAnswer(answerId) {
    const answers = loadAnswersForToday();
    const idx = answers.findIndex((a) => a.id === answerId);
    if (idx === -1) return;

    const userId = "me";
    const likes = answers[idx].likes || [];
    const hasLiked = likes.includes(userId);

    if (hasLiked) {
        answers[idx].likes = likes.filter((id) => id !== userId);
    } else {
        answers[idx].likes = [...likes, userId];
    }

    saveAnswersForToday(answers);
    renderAnswerList();
}

/* -----------------------------------------------------
   🎯 이벤트 리스너 등록
----------------------------------------------------- */

/* 답변 제출 */
answerForm?.addEventListener("submit", handleAnswerSubmit);

/* 글자 수 실시간 표시 */
answerInput?.addEventListener("input", updateAnswerLengthHint);

/* 댓글 제출 */
commentForm?.addEventListener("submit", handleCommentSubmit);

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
    renderAnswerList();
});
