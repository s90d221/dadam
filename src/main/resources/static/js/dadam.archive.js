/* =====================================================
   dadam.archive.js
   - 지난 질문/답변을 날짜별로 조회하는 캘린더 모달
   - 질문, 답변, 댓글을 함께 보여주는 추억 보기 기능
===================================================== */

const archiveModalId = "modal-question-archive";
const archiveOpenBtn = document.getElementById("open-question-archive");
const archiveCalendarTitleEl = document.getElementById("archive-calendar-title");
const archiveCalendarGridEl = document.getElementById("archive-calendar-grid");
const archiveCalendarPrevBtn = document.getElementById("archive-calendar-prev");
const archiveCalendarNextBtn = document.getElementById("archive-calendar-next");

const archiveSelectedDateEl = document.getElementById("archive-selected-date");
const archiveQuestionTextEl = document.getElementById("archive-question-text");
const archiveAnswerListEl = document.getElementById("archive-answer-list");
const archiveAnswerCountEl = document.getElementById("archive-answer-count");
const archiveEmptyStateEl = document.getElementById("archive-empty-state");

let archiveCalendarState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
};

function archiveAuthHeaders(base = {}) {
    const token = getAuthToken ? getAuthToken() : localStorage.getItem("dadam_auth_token");
    return {
        ...base,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function archiveFormatDateKey(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function archiveFormatKoreanDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    return `${y}년 ${m}월 ${d}일`;
}

function archiveEscapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function fetchJsonWithFallbacks(urls) {
    for (const url of urls) {
        try {
            const res = await fetch(url, {
                method: "GET",
                headers: archiveAuthHeaders({ "Content-Type": "application/json" }),
            });
            if (!res.ok) continue;
            return await res.json();
        } catch (_) {
            // try next
        }
    }
    throw new Error("질문 정보를 불러오지 못했어요.");
}

async function fetchQuestionByDate(dateKey) {
    const endpoints = [
        `${API_BASE}/questions/history?date=${dateKey}`,
        `${API_BASE}/questions?date=${dateKey}`,
        `${API_BASE}/questions/date/${dateKey}`,
    ];
    return fetchJsonWithFallbacks(endpoints);
}

async function fetchAnswersForQuestion(questionId) {
    const url = `${API_BASE}/questions/${questionId}/answers`;
    const res = await fetch(url, {
        method: "GET",
        headers: archiveAuthHeaders({ "Content-Type": "application/json" }),
    });
    if (!res.ok) return [];
    return res.json();
}

async function fetchCommentsForAnswer(questionId, answerId) {
    const url = `${API_BASE}/questions/${questionId}/answers/${answerId}/comments`;
    try {
        const res = await fetch(url, {
            method: "GET",
            headers: archiveAuthHeaders({ "Content-Type": "application/json" }),
        });
        if (!res.ok) return [];
        return await res.json();
    } catch (_) {
        return [];
    }
}

function normalizeQuestionResponse(raw) {
    if (!raw) return { id: null, text: "" };
    return {
        id: raw.id ?? raw.questionId ?? raw.questionID ?? raw.question_id ?? null,
        text:
            raw.content ||
            raw.question ||
            raw.text ||
            raw.title ||
            raw.questionText ||
            "",
        answers: raw.answers ?? raw.answerList ?? [],
    };
}

function renderArchiveAnswers(answers) {
    if (!archiveAnswerListEl) return;

    if (!Array.isArray(answers) || answers.length === 0) {
        archiveAnswerListEl.innerHTML = "";
        archiveAnswerCountEl.textContent = "답변 없음";
        if (archiveEmptyStateEl) archiveEmptyStateEl.style.display = "block";
        return;
    }

    archiveAnswerCountEl.textContent = `${answers.length}개`;
    if (archiveEmptyStateEl) archiveEmptyStateEl.style.display = "none";

    const html = answers
        .map((ans) => {
            const displayName = getDisplayNameForUser
                ? getDisplayNameForUser(ans.userId, ans.userName)
                : ans.userName || "가족";
            const avatarLabel =
                typeof getAvatarLabel === "function"
                    ? getAvatarLabel(displayName)
                    : displayName;
            const text = archiveEscapeHtml(ans.content || ans.text || "");
            const createdLabel = ans.createdAt ? formatTimeLabel(ans.createdAt) : "";

            const comments = Array.isArray(ans.comments) ? ans.comments : [];
            const commentHtml = comments
                .map((c) => {
                    const commenter =
                        (typeof getDisplayNameForUser === "function"
                            ? getDisplayNameForUser(c.userId, c.userName)
                            : c.userName) || "가족";
                    return `
              <li class="archive-comment-item">
                <span class="archive-comment-author">${archiveEscapeHtml(commenter)}</span>
                <span class="archive-comment-text">${archiveEscapeHtml(c.content || c.text || "")}</span>
              </li>
            `;
                })
                .join("");

            return `
          <li class="archive-answer-item">
            <div class="archive-answer-meta">
              <span class="avatar avatar-xs avatar-soft"><span class="avatar-initial">${archiveEscapeHtml(
                  avatarLabel
              )}</span></span>
              <span>${archiveEscapeHtml(displayName)}</span>
              <span>${archiveEscapeHtml(createdLabel)}</span>
            </div>
            <p class="archive-answer-text">${text}</p>
            ${commentHtml ? `<ul class="archive-comment-list">${commentHtml}</ul>` : ""}
          </li>
        `;
        })
        .join("");

    archiveAnswerListEl.innerHTML = html;
}

async function loadArchiveForDate(dateKey) {
    if (!dateKey) return;

    if (archiveSelectedDateEl) {
        archiveSelectedDateEl.textContent = archiveFormatKoreanDate(dateKey);
    }

    if (archiveQuestionTextEl) {
        archiveQuestionTextEl.textContent = "질문을 불러오는 중...";
    }

    try {
        const questionRaw = await fetchQuestionByDate(dateKey);
        const question = normalizeQuestionResponse(questionRaw);

        if (!question.id && !question.text) {
            archiveQuestionTextEl.textContent = "해당 날짜의 질문을 찾을 수 없어요.";
            renderArchiveAnswers([]);
            return;
        }

        archiveQuestionTextEl.textContent = question.text || "질문이 없어요.";

        let answers = Array.isArray(question.answers) ? question.answers : [];
        if (!answers.length && question.id) {
            answers = await fetchAnswersForQuestion(question.id);
        }

        if (question.id && Array.isArray(answers)) {
            const enriched = await Promise.all(
                answers.map(async (ans) => {
                    const comments = await fetchCommentsForAnswer(question.id, ans.id);
                    return { ...ans, comments };
                })
            );
            renderArchiveAnswers(enriched);
        } else {
            renderArchiveAnswers(answers);
        }
    } catch (err) {
        console.error("[ARCHIVE] load error", err);
        if (archiveQuestionTextEl) {
            archiveQuestionTextEl.textContent = "질문을 불러오지 못했어요.";
        }
        renderArchiveAnswers([]);
    }
}

function renderArchiveCalendar(year, monthIndex) {
    if (!archiveCalendarGridEl || !archiveCalendarTitleEl) return;

    const firstDay = new Date(year, monthIndex, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    archiveCalendarTitleEl.textContent = `${year}년 ${monthIndex + 1}월`;
    archiveCalendarGridEl.innerHTML = "";

    for (let i = 0; i < firstWeekday; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "calendar-cell calendar-cell-empty";
        archiveCalendarGridEl.appendChild(emptyCell);
    }

    const todayKey = archiveFormatDateKey(new Date());

    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, monthIndex, day);
        const dateKey = archiveFormatDateKey(cellDate);

        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "calendar-cell";
        cell.dataset.date = dateKey;
        if (dateKey === todayKey) {
            cell.classList.add("today");
        }

        const dayNumberEl = document.createElement("div");
        dayNumberEl.className = "calendar-day-number";
        dayNumberEl.textContent = day;
        cell.appendChild(dayNumberEl);

        archiveCalendarGridEl.appendChild(cell);
    }
}

function openQuestionArchiveModal() {
    archiveCalendarState = {
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
    };
    renderArchiveCalendar(archiveCalendarState.year, archiveCalendarState.month);
    const todayKey = archiveFormatDateKey(new Date());
    loadArchiveForDate(todayKey);
    openModal(archiveModalId);
}

archiveOpenBtn?.addEventListener("click", () => {
    openQuestionArchiveModal();
});

archiveCalendarPrevBtn?.addEventListener("click", () => {
    let { year, month } = archiveCalendarState;
    month -= 1;
    if (month < 0) {
        month = 11;
        year -= 1;
    }
    archiveCalendarState = { year, month };
    renderArchiveCalendar(year, month);
});

archiveCalendarNextBtn?.addEventListener("click", () => {
    let { year, month } = archiveCalendarState;
    month += 1;
    if (month > 11) {
        month = 0;
        year += 1;
    }
    archiveCalendarState = { year, month };
    renderArchiveCalendar(year, month);
});

document.addEventListener("click", (e) => {
    const cell = e.target.closest("#archive-calendar-grid .calendar-cell");
    if (!cell || !cell.dataset.date) return;
    if (cell.classList.contains("calendar-cell-empty")) return;
    loadArchiveForDate(cell.dataset.date);
});
