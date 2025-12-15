/* =====================================================
   dadam.quiz.js
   - 신조어 퀴즈: 오늘자 1개 조회 + 보기별 투표 + 정답 확인
   - 백엔드:
       GET  /api/v1/quiz/today      → SlangQuizTodayResponse
       POST /api/v1/quiz/today/vote → SlangQuizTodayResponse
===================================================== */

/* ================= 공통 상수 ================= */
// API_BASE 는 dadam.core.js 에서 정의되어 있다고 가정
const QUIZ_TODAY_API_URL = `${API_BASE}/quiz/today`;
const QUIZ_VOTE_API_URL  = `${API_BASE}/quiz/today/vote`;

const quizContainer   = document.getElementById("slang-quiz");
const quizQuestionEl  = document.getElementById("quiz-question");
const quizOptionsList = document.getElementById("quiz-options");
const quizFeedbackEl  = document.getElementById("quiz-feedback");
const quizCheckBtn    = document.getElementById("quiz-submit-btn");

let currentQuiz   = null;
let selectedIndex = null;  // 내가 현재 화면에서 고른 보기 인덱스
let revealed      = false; // 정답 확인 상태 여부

/* -----------------------------------------------------
   🔐 이 파일 전용 API 헬퍼 (JWT 헤더 직접 붙이기)
----------------------------------------------------- */
async function quizApiGet(url) {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (res.status === 401) {
        // 로그인 요구
        if (typeof setAuthUiState === "function") {
            setAuthUiState(false);
        }
        throw new Error("401 Unauthorized");
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GET ${url} 실패: ${text}`);
    }

    return res.json();
}

async function quizApiPost(url, body) {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body ?? {}),
    });

    if (res.status === 401) {
        if (typeof setAuthUiState === "function") {
            setAuthUiState(false);
        }
        throw new Error("401 Unauthorized");
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST ${url} 실패: ${text}`);
    }

    return res.json();
}

/* ---------------- 아바타 라벨 헬퍼 ---------------- */
function getQuizAvatarLabel(rawName) {
    if (!rawName) return "가족";
    const name = String(rawName).trim();
    if (name.length === 0) return "가족";
    const parts = name.split(/\s+/);
    const lastPart = parts[parts.length - 1];

    if (/^[가-힣]+$/.test(lastPart)) {
        if (lastPart.length <= 2) return lastPart;
        if (lastPart.length === 3) return lastPart.slice(1);
        return lastPart;
    }
    return lastPart;
}

/* ---------------- 응답 정규화 ---------------- */
function normalizeQuizSummary(raw) {
    if (!raw) return null;

    const choices = Array.isArray(raw.choices) ? raw.choices : [];

    const votes0 = Array.isArray(raw.votes0) ? raw.votes0 : [];
    const votes1 = Array.isArray(raw.votes1) ? raw.votes1 : [];
    const votes2 = Array.isArray(raw.votes2) ? raw.votes2 : [];

    const answerText  = raw.answer || "";
    const answerIndex = typeof raw.answerIndex === "number"
        ? raw.answerIndex
        : -1;

    const myChoiceIndex = typeof raw.myChoiceIndex === "number"
        ? raw.myChoiceIndex
        : null;

    return {
        id: raw.id,
        question: raw.question || "신조어 퀴즈",
        choices,
        explanation: raw.explanation || "",
        answer: answerText,
        answerIndex,
        myChoiceIndex,
        votes: [votes0, votes1, votes2],
    };
}

/* ---------------- 렌더링 ---------------- */
function renderQuiz() {
    if (!quizContainer || !currentQuiz) return;

    if (quizQuestionEl) {
        quizQuestionEl.textContent = currentQuiz.question;
    }

    if (quizOptionsList) {
        quizOptionsList.innerHTML = currentQuiz.choices
            .map((opt, idx) => {
                return `
          <li class="quiz-option-item">
            <button class="quiz-option" type="button" data-index="${idx}">
              <span class="quiz-option-label">${idx + 1}.</span>
              <span class="quiz-option-text">${opt}</span>
            </button>
            <div class="quiz-option-meta">
              <div class="quiz-option-bar" data-quiz-bar="${idx}"></div>
              <span class="quiz-option-percent" data-quiz-percent="${idx}">0%</span>
              <div class="quiz-option-avatars" data-quiz-avatars="${idx}"></div>
            </div>
          </li>
        `;
            })
            .join("");
    }

    if (quizFeedbackEl) {
        quizFeedbackEl.textContent = "";
    }

    updateQuizVisuals();
}

/* 보기별 퍼센트, 버튼 상태 등 */
function updateQuizVisuals() {
    if (!currentQuiz) return;

    const lockedIndex = currentQuiz.myChoiceIndex;
    const isLocked    = lockedIndex !== null && lockedIndex !== undefined;

    // 서버가 이미 내가 고른 보기(myChoiceIndex)를 알고 있으면, selectedIndex 초기값으로 사용
    if (isLocked && selectedIndex === null) {
        selectedIndex = lockedIndex;
    }

    const totalVotes =
        (currentQuiz.votes[0]?.length || 0) +
        (currentQuiz.votes[1]?.length || 0) +
        (currentQuiz.votes[2]?.length || 0);

    currentQuiz.choices.forEach((_, idx) => {
        const bar         = document.querySelector(`[data-quiz-bar="${idx}"]`);
        const percentSpan = document.querySelector(`[data-quiz-percent="${idx}"]`);
        const avatarsBox  = document.querySelector(`[data-quiz-avatars="${idx}"]`);
        const optionBtn   = quizOptionsList?.querySelector(
            `.quiz-option[data-index="${idx}"]`
        );

        const votesForChoice = currentQuiz.votes[idx] || [];
        const percent =
            totalVotes === 0
                ? 0
                : Math.round((votesForChoice.length / totalVotes) * 100);

        if (bar) {
            bar.style.width = "100%";
            bar.style.setProperty("--bar", percent + "%");
        }
        if (percentSpan) percentSpan.textContent = percent + "%";

        if (avatarsBox) {
            // 1) 서버에서 내려온 투표자들 아바타 렌더링
            avatarsBox.innerHTML = votesForChoice
                .map((voter) => {
                    const rawName =
                        typeof voter === "string"
                            ? voter
                            : (voter.userName || "가족");
                    const label = getQuizAvatarLabel(rawName);
                    return `
              <span class="avatar avatar-sm">
                <span class="avatar-initial">${label}</span>
              </span>
            `;
                })
                .join("");

            // 2) 아직 서버에 투표하지 않았고(revealed=false, isLocked=false),
            //    현재 화면에서 내가 선택한 보기라면 → 내 아바타를 임시로 렌더링
            if (!revealed && !isLocked && selectedIndex === idx) {
                const meName =
                    (typeof currentUser !== "undefined" &&
                        currentUser &&
                        currentUser.name) ||
                    "나";
                const meLabel = getQuizAvatarLabel(meName);

                avatarsBox.innerHTML += `
              <span class="avatar avatar-sm avatar-me">
                <span class="avatar-initial">${meLabel}</span>
              </span>
            `;
            }
        }

        if (optionBtn) {
            optionBtn.classList.remove("selected", "correct", "wrong");

            // 화면에서 내가 현재 고른 보기
            if (selectedIndex === idx) {
                optionBtn.classList.add("selected");
            }

            // 정답 공개 후에는 정답/오답 색 표시
            if (revealed && currentQuiz.answerIndex !== -1) {
                if (idx === currentQuiz.answerIndex) {
                    optionBtn.classList.add("correct");
                } else if (idx === selectedIndex) {
                    optionBtn.classList.add("wrong");
                }
            }

            // ✅ 항상 클릭 가능하게 두고,
            //    "이미 참여" 여부는 클릭 핸들러에서 제어
            optionBtn.disabled = false;
        }
    });

    // 정답 확인 버튼: 선택이 있을 때만 보이고, 정답 공개 후엔 비활성화
    if (quizCheckBtn) {
        if (selectedIndex === null) {
            quizCheckBtn.style.display = "none";
        } else {
            quizCheckBtn.style.display = "inline-flex";
            quizCheckBtn.disabled = revealed;
        }
    }
}

/* 정답 풀이 텍스트 업데이트 */
function updateQuizFeedback() {
    if (!currentQuiz || !quizFeedbackEl) return;
    if (!revealed || selectedIndex === null) {
        quizFeedbackEl.textContent = "";
        return;
    }

    const isCorrect =
        currentQuiz.answerIndex !== -1 &&
        selectedIndex === currentQuiz.answerIndex;

    if (isCorrect) {
        quizFeedbackEl.textContent =
            "정답이에요! ✨ " + (currentQuiz.explanation || "");
    } else {
        const correctText =
            currentQuiz.answerIndex !== -1
                ? currentQuiz.choices[currentQuiz.answerIndex]
                : currentQuiz.answer;

        quizFeedbackEl.textContent =
            "아惜! 정답은 '" +
            correctText +
            "' 이에요. " +
            (currentQuiz.explanation || "");
    }
}

/* ---------------- 서버에서 오늘 퀴즈 가져오기 ---------------- */
async function fetchTodayQuiz() {
    if (!quizContainer) return; // 해당 UI가 없는 페이지에서는 무시

    try {
        const raw = await quizApiGet(QUIZ_TODAY_API_URL);
        console.log("[QUIZ] today response:", raw);

        const summary = normalizeQuizSummary(raw);
        if (!summary) throw new Error("Invalid quiz data");

        currentQuiz   = summary;
        selectedIndex = summary.myChoiceIndex ?? null;

        if (selectedIndex !== null &&
            selectedIndex !== undefined &&
            summary.answerIndex !== -1) {
            revealed = true;
        } else {
            revealed = false;
        }

        renderQuiz();

        if (revealed) {
            updateQuizFeedback();
            updateQuizVisuals();
        }

        // if (typeof addNotification === "function") {
        //     addNotification({
        //         type: "info",
        //         message: "오늘의 신조어 퀴즈가 준비되었어요.",
        //     });
        // }
    } catch (err) {
        console.error("[QUIZ] error:", err);
        const msg = String(err.message || "");

        if (msg.includes("401")) {
            if (typeof setAuthUiState === "function") {
                setAuthUiState(false);
            }
            return;
        }

        if (quizQuestionEl) {
            quizQuestionEl.textContent = "퀴즈를 불러오지 못했어요.";
        }
    }
}

/* ---------------- 서버에 투표 보내기 ---------------- */
async function sendQuizVote(choiceIndex) {
    try {
        const raw = await quizApiPost(QUIZ_VOTE_API_URL, { choiceIndex });
        console.log("[QUIZ] vote response:", raw);

        const summary = normalizeQuizSummary(raw);
        if (!summary) throw new Error("Invalid quiz vote data");

        currentQuiz   = summary;
        selectedIndex = summary.myChoiceIndex ?? choiceIndex;
        revealed      = true;

        updateQuizFeedback();
        updateQuizVisuals();

        if (typeof addNotification === "function") {
            const voterName =
                (typeof currentUser !== "undefined" &&
                    currentUser &&
                    currentUser.name) ||
                "나";

            addNotification({
                type: "info",
                message: `${voterName}님이 신조어 퀴즈에서 ${selectedIndex + 1}번을 선택했어요.`,
            });
        }
    } catch (err) {
        console.error("[QUIZ] vote error:", err);

        const msg = String(err.message || "");

        if (msg.includes("401")) {
            if (typeof setAuthUiState === "function") {
                setAuthUiState(false);
            }
        } else if (msg.includes("이미") || msg.includes("ALREADY_PARTICIPATED")) {
            alert("이미 오늘 퀴즈에 참여하셨어요.");
            fetchTodayQuiz();
        } else {
            if (typeof addNotification === "function") {
                addNotification({
                    type: "error",
                    message: "퀴즈 선택에 실패했어요. 잠시 후 다시 시도해 주세요.",
                });
            }
        }
    }
}

/* ---------------- 초기화 & 이벤트 ---------------- */

/**
 * 🔄 현재 로그인된 계정 기준으로 퀴즈 상태 리셋 + 재조회
 * - 계정 변경(로그인/로그아웃/회원가입 후) 시 이 함수를 호출해야
 *   이전 계정의 myChoiceIndex 때문에 "이미 참여"라고 뜨는 문제를 방지할 수 있음.
 */
function resetQuizForCurrentUser() {
    // in-memory 상태 초기화
    currentQuiz   = null;
    selectedIndex = null;
    revealed      = false;

    if (!quizContainer) return;

    const token = typeof getAuthToken === "function" ? getAuthToken() : null;

    // 토큰이 없으면 로그인 안내만 표시
    if (!token) {
        if (quizCheckBtn) {
            quizCheckBtn.style.display = "none";
        }

        if (typeof setAuthUiState === "function") {
            setAuthUiState(false);
        }
        return;
    }

    if (quizCheckBtn) {
        quizCheckBtn.style.display = "none";
    }

    // 현재 토큰(=현재 계정) 기준으로 오늘 퀴즈 다시 불러오기
    fetchTodayQuiz();
}

// 다른 스크립트에서 호출 가능하도록 전역에 노출
window.resetQuizForCurrentUser = resetQuizForCurrentUser;

function initQuiz() {
    if (!quizContainer) return;
    // 최초 진입 시도에도 현재 토큰 기준으로 초기화/조회
    resetQuizForCurrentUser();
}

/* 보기 버튼 클릭 */
document.addEventListener("click", (e) => {
    if (!quizContainer || !currentQuiz) return;

    const btn = e.target.closest(".quiz-option");
    if (!btn) return;

    const idx = Number(btn.dataset.index);
    if (Number.isNaN(idx)) return;

    const hasLocked =
        currentQuiz.myChoiceIndex !== null &&
        currentQuiz.myChoiceIndex !== undefined;

    // ✅ 이미 서버에 투표한 상태면 더 이상 변경 불가
    if (hasLocked) {
        alert("이미 오늘 퀴즈에 참여하셨어요.");
        return;
    }

    // ✅ 정답을 이미 확인한 상태(revealed=true)면 변경 불가
    if (revealed) return;

    // ✅ 아직 정답 확인 전 → 화면에서 선택만 바꾼다 (서버 투표 X)
    selectedIndex = idx;
    updateQuizVisuals();
});

/* "정답 확인" 버튼 */
quizCheckBtn?.addEventListener("click", async () => {
    if (!currentQuiz || selectedIndex === null || revealed) return;

    // 아직 서버에 투표가 안 된 경우에만 투표 요청
    if (
        currentQuiz.myChoiceIndex === null ||
        currentQuiz.myChoiceIndex === undefined
    ) {
        await sendQuizVote(selectedIndex);
        return;
    }

    // 안전망 (이미 서버가 myChoiceIndex 를 알고 있는 경우)
    revealed = true;
    updateQuizFeedback();
    updateQuizVisuals();
});

/* DOM 로드 시 초기화 */
document.addEventListener("DOMContentLoaded", () => {
    initQuiz();
});
