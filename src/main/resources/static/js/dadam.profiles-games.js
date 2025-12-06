/* =====================================================
   dadam.profiles-games.js
   - 프로필 이미지 업로드 / 저장 / 불러오기
   - 밸런스 게임 선택 로직 (백엔드 연동 + 로컬 상태)
   - 신조어 퀴즈 선택 로직 (백엔드 연동 + 로컬 상태)
   - 선택한 사람들 아바타 렌더링
===================================================== */

/* -----------------------------------------------------
   👨‍👩‍👧 가족/유저 정보 (아바타 렌더링용 맵)
----------------------------------------------------- */

const DADAM_FAMILY = {
    mom: { id: "mom", name: "엄마", initial: "엄" },
    dad: { id: "dad", name: "아빠", initial: "아" },
    me: { id: "me", name: currentUser.name || "나", initial: "나" },
};

/* currentUser 이름이 바뀌면 me에도 반영하기 위한 헬퍼 */
function syncMeToFamily() {
    DADAM_FAMILY.me.name = currentUser.name || "나";
}

/* -----------------------------------------------------
   🧍 프로필 편집 / 이미지 업로드
----------------------------------------------------- */

const profileForm = document.getElementById("profile-form");
const profileImageInput = document.getElementById("profile-image-input");
const profileNameInput = document.getElementById("profile-name-input");
const profileRoleInput = document.getElementById("profile-role-input");
const profileAvatarPreview = document.getElementById("profile-avatar-preview");
const headerAvatar = document.getElementById("current-avatar");
const headerUsername = document.getElementById("current-username");

function updateAvatarVisuals() {
    // 헤더 쪽 이름
    if (headerUsername) {
        headerUsername.textContent = currentUser.name || "우리 가족";
    }

    // 프로필 모달 아바타
    if (profileAvatarPreview) {
        if (currentUser.avatar) {
            profileAvatarPreview.style.backgroundImage = `url(${currentUser.avatar})`;
            profileAvatarPreview.style.backgroundSize = "cover";
            profileAvatarPreview.style.backgroundPosition = "center";
            profileAvatarPreview.textContent = "";
        } else {
            profileAvatarPreview.style.backgroundImage = "none";
            profileAvatarPreview.textContent = (currentUser.name || "나")[0];
        }
    }

    // 헤더 아바타
    if (headerAvatar) {
        if (currentUser.avatar) {
            headerAvatar.style.backgroundImage = `url(${currentUser.avatar})`;
            headerAvatar.style.backgroundSize = "cover";
            headerAvatar.style.backgroundPosition = "center";
            headerAvatar.textContent = "";
        } else {
            headerAvatar.style.backgroundImage = "none";
            const initialSpan = headerAvatar.querySelector(".avatar-initial");
            if (initialSpan) {
                initialSpan.textContent = (currentUser.name || "나")[0];
            } else {
                headerAvatar.textContent = (currentUser.name || "나")[0];
            }
        }
    }

    // 사이드바 가족 목록의 "me" 셀 업데이트
    const meCell = document.querySelector('.family-cell[data-user-id="me"]');
    if (meCell) {
        const nameEl = meCell.querySelector(".family-name");
        const avatarEl = meCell.querySelector(".avatar");
        if (nameEl) nameEl.textContent = currentUser.name || "나";
        if (avatarEl) {
            if (currentUser.avatar) {
                avatarEl.style.backgroundImage = `url(${currentUser.avatar})`;
                avatarEl.style.backgroundSize = "cover";
                avatarEl.style.backgroundPosition = "center";
                avatarEl.textContent = "";
            } else {
                avatarEl.style.backgroundImage = "none";
                const init = avatarEl.querySelector(".avatar-initial");
                if (init) init.textContent = (currentUser.name || "나")[0];
                else avatarEl.textContent = (currentUser.name || "나")[0];
            }
        }
    }
}

/* 초기 아바타 반영 */
updateAvatarVisuals();

/* 이미지 업로드 */
profileImageInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
        const dataUrl = ev.target.result;
        currentUser.avatar = dataUrl;
        save(DADAM_KEYS.USER_PROFILE, currentUser);
        syncMeToFamily();
        updateAvatarVisuals();
        addNotification({
            type: "info",
            message: "프로필 이미지가 업데이트되었어요.",
        });
    };
    reader.readAsDataURL(file);
});

/* 프로필 폼 제출 */
profileForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const newName = profileNameInput.value.trim() || "나";
    const newRole = profileRoleInput.value || "child";

    currentUser.name = newName;
    currentUser.role = newRole;
    save(DADAM_KEYS.USER_PROFILE, currentUser);
    syncMeToFamily();
    updateAvatarVisuals();

    addNotification({
        type: "info",
        message: "프로필 정보가 저장되었어요.",
    });

    closeModal("modal-profile");
});

/* -----------------------------------------------------
   ⚖ 밸런스 게임 로직 (/api/v1/balance/generate)
----------------------------------------------------- */

/* 예비용(백엔드 장애 시) 기본 밸런스 게임 풀 */
const BALANCE_POOL = [
    {
        id: "food-ramen-chicken",
        question: "평생 한 가지 음식만 먹어야 한다면?",
        A: "라면 🍜",
        B: "치킨 🍗",
    },
    {
        id: "trip-mountain-sea",
        question: "가족 여행지로 한 곳만 고른다면?",
        A: "바다 여행 🏖️",
        B: "산속 캠핑 ⛺",
    },
    {
        id: "time-morning-night",
        question: "가족이 같이 보내기 좋은 시간대는?",
        A: "아침 브런치 타임 ☕",
        B: "늦은 밤 수다 타임 🌙",
    },
    {
        id: "home-movie-outside",
        question: "주말에 뭐가 더 좋아?",
        A: "집에서 영화 몰아보기 🎬",
        B: "밖에 나가 액티비티 🏃",
    },
];

const BALANCE_API_URL = "/api/v1/balance/generate";

const balanceContainer = document.getElementById("balance-game");
const balanceQuestionEl = document.getElementById("balance-question");
const balanceOptions = document.querySelectorAll(".balance-option");
const regenBalanceBtn = document.getElementById("regen-balance");

/* Swagger DTO
   {
     "question": "string",
     "optionA": "string",
     "optionB": "string",
     "category": "string"
   }
*/
function normalizeBalanceGame(raw) {
    if (!raw) return null;
    const category = raw.category || "ETC";
    return {
        id: `${category}-${Date.now()}`, // 서버에서 id 안 주므로 프론트에서 생성
        question: raw.question || "가족 밸런스 게임",
        A: raw.optionA || "A 선택지",
        B: raw.optionB || "B 선택지",
        category,
    };
}

/* 저장된 밸런스 상태 불러오기
   - { id, question, A, B, category, votes: { A:[], B:[] } }
*/
function loadBalanceState() {
    return load(DADAM_KEYS.BALANCE_GAME, null);
}

function saveBalanceState(state) {
    save(DADAM_KEYS.BALANCE_GAME, state);
}

/* 퍼센트 & 아바타 렌더링 */
function renderBalanceFromState(state) {
    if (!state) return;

    const votesA = state.votes?.A || [];
    const votesB = state.votes?.B || [];
    const total = votesA.length + votesB.length;

    const percentA =
        total === 0 ? 0 : Math.round((votesA.length / total) * 100);
    const percentB = total === 0 ? 0 : 100 - percentA;

    const barA = document.querySelector('[data-bar="A"]');
    const barB = document.querySelector('[data-bar="B"]');
    const labelA = document.querySelector('[data-percent="A"]');
    const labelB = document.querySelector('[data-percent="B"]');

    if (barA) barA.style.width = percentA + "%";
    if (barB) barB.style.width = percentB + "%";
    if (labelA) labelA.textContent = percentA + "%";
    if (labelB) labelB.textContent = percentB + "%";

    const avatarA = document.querySelector('[data-avatars="A"]');
    const avatarB = document.querySelector('[data-avatars="B"]');

    if (avatarA) {
        avatarA.innerHTML = votesA
            .map((uid) => {
                const info =
                    DADAM_FAMILY[uid] || { name: "가족", initial: "가" };
                return `
          <span class="avatar avatar-sm">
            <span class="avatar-initial">${info.initial}</span>
          </span>
        `;
            })
            .join("");
    }

    if (avatarB) {
        avatarB.innerHTML = votesB
            .map((uid) => {
                const info =
                    DADAM_FAMILY[uid] || { name: "가족", initial: "가" };
                return `
          <span class="avatar avatar-sm">
            <span class="avatar-initial">${info.initial}</span>
          </span>
        `;
            })
            .join("");
    }
}

/* 밸런스 게임 화면에 설정 */
function setBalanceGame(game, existingState = null) {
    if (!balanceContainer || !game) return;

    const state = {
        id: game.id,
        question: game.question,
        A: game.A,
        B: game.B,
        category: game.category || "ETC",
        votes: existingState?.votes || { A: [], B: [] },
    };

    balanceContainer.dataset.gameId = state.id;
    if (balanceQuestionEl) balanceQuestionEl.textContent = state.question;

    balanceOptions.forEach((btn) => {
        const choice = btn.dataset.choice;
        const textEl = btn.querySelector(".balance-text");
        if (!textEl) return;
        if (choice === "A") textEl.textContent = state.A;
        if (choice === "B") textEl.textContent = state.B;
    });

    saveBalanceState(state);
    renderBalanceFromState(state);
}

/* 서버에서 새로운 밸런스 게임 가져오기 */
async function fetchBalanceGameFromServer() {
    try {
        const res = await fetch(BALANCE_API_URL, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch balance game");
        const raw = await res.json();
        const game = normalizeBalanceGame(raw);
        if (!game) throw new Error("Invalid balance game data");
        setBalanceGame(game, null);
        addNotification({
            type: "info",
            message: "새로운 밸런스 게임이 준비되었어요.",
        });
    } catch (err) {
        console.error(err);
        const fallback =
            BALANCE_POOL[Math.floor(Math.random() * BALANCE_POOL.length)];
        setBalanceGame(fallback, null);
        addNotification({
            type: "error",
            message:
                "서버에서 밸런스 게임을 불러오지 못해, 기본 문제를 보여드릴게요.",
        });
    }
}

/* 밸런스 게임 초기화 */
function initBalanceGame() {
    if (!balanceContainer) return;

    const saved = loadBalanceState();
    if (saved) {
        setBalanceGame(saved, saved);
    } else {
        fetchBalanceGameFromServer();
    }
}

/* 선택 처리 */
function handleBalanceChoice(choice) {
    if (!balanceContainer) return;

    const currentGameId = balanceContainer.dataset.gameId;
    if (!currentGameId) return;

    let state = loadBalanceState();
    if (!state || state.id !== currentGameId) {
        state = {
            id: currentGameId,
            question: balanceQuestionEl?.textContent || "",
            A:
                document.querySelector(
                    '.balance-option[data-choice="A"] .balance-text'
                )?.textContent || "A",
            B:
                document.querySelector(
                    '.balance-option[data-choice="B"] .balance-text'
                )?.textContent || "B",
            category: "ETC",
            votes: { A: [], B: [] },
        };
    }

    const userId = "me"; // 실제로는 로그인 유저 ID로 대체
    state.votes.A = state.votes.A.filter((id) => id !== userId);
    state.votes.B = state.votes.B.filter((id) => id !== userId);
    if (!state.votes[choice].includes(userId)) {
        state.votes[choice].push(userId);
    }

    saveBalanceState(state);
    renderBalanceFromState(state);

    const text = choice === "A" ? state.A : state.B;
    addNotification({
        type: "info",
        message: `밸런스 게임에서 "${text}"를 선택했어요.`,
    });
}

/* 옵션 클릭 이벤트 (위임) */
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".balance-option");
    if (!btn || !balanceContainer) return;

    const choice = btn.dataset.choice;
    if (!choice) return;

    handleBalanceChoice(choice);
});

/* 다른 주제 버튼 */
regenBalanceBtn?.addEventListener("click", () => {
    fetchBalanceGameFromServer();
});

/* -----------------------------------------------------
   💬 신조어 퀴즈 로직 (/api/v1/quiz/generate)
----------------------------------------------------- */

const QUIZ_BANK = [
    {
        id: "aljaldakkal",
        question: "“알잘딱깔센”의 뜻은 무엇일까요?",
        options: [
            "알아서 잘 딱 깔끔하고 센스 있게",
            "알바는 잘 딱 깔끔하고 센스 있게",
            "알고 잘 딱 깔끔하게 설명",
        ],
        correctIndex: 0,
        explanation:
            "알아서 잘 딱 깔끔하고 센스 있게! 요즘 자주 쓰는 칭찬 표현이에요.",
    },
];

const QUIZ_API_URL = "/api/v1/quiz/generate";

const quizContainer = document.getElementById("slang-quiz");
const quizQuestionEl = document.getElementById("quiz-question");
const quizOptionsList = document.getElementById("quiz-options");
const quizFeedbackEl = document.getElementById("quiz-feedback");
const regenQuizBtn = document.getElementById("regen-quiz");

/* Swagger DTO
   {
     "question": "string",
     "answer": "string",
     "choices": ["string"],
     "explanation": "string"
   }
*/
function normalizeQuiz(raw) {
    if (!raw) return null;

    const question = raw.question || "신조어 퀴즈";
    const explanation =
        raw.explanation ||
        "신조어 퀴즈에요. 정답을 확인해 보세요!";
    const options = Array.isArray(raw.choices) ? raw.choices : [];
    const answerSentence = raw.answer || "";

    let correctIndex = 0;
    if (options.length > 0 && answerSentence) {
        const idx = options.findIndex(
            (c) => c.trim() === answerSentence.trim()
        );
        if (idx >= 0) correctIndex = idx;
    }

    return {
        id: `quiz-${Date.now()}`,
        question,
        options: options.length ? options : [answerSentence],
        correctIndex,
        explanation,
        answerSentence,
    };
}

function setQuiz(quiz) {
    if (!quizContainer || !quiz) return;

    quizContainer.dataset.quizId = quiz.id;
    if (quizQuestionEl) quizQuestionEl.textContent = quiz.question;

    if (quizOptionsList) {
        quizOptionsList.innerHTML = quiz.options
            .map(
                (opt, idx) => `
        <li>
          <button class="quiz-option" type="button" data-index="${idx}">
            ${idx + 1}. ${opt}
          </button>
        </li>
      `
            )
            .join("");
    }

    if (quizFeedbackEl) {
        quizFeedbackEl.textContent = "";
    }

    const newState = {
        id: quiz.id,
        question: quiz.question,
        options: quiz.options,
        correctIndex: quiz.correctIndex,
        explanation: quiz.explanation,
        answered: false,
        correct: null,
    };
    save(DADAM_KEYS.QUIZ_STATE, newState);
}

/* 서버에서 새 퀴즈 가져오기 */
async function fetchQuizFromServer() {
    try {
        const res = await fetch(QUIZ_API_URL, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch quiz");
        const raw = await res.json();
        const quiz = normalizeQuiz(raw);
        if (!quiz || !quiz.options.length) throw new Error("Invalid quiz data");

        setQuiz(quiz);
        addNotification({
            type: "info",
            message: "새로운 신조어 퀴즈가 준비되었어요.",
        });
    } catch (err) {
        console.error(err);
        const fallback =
            QUIZ_BANK[Math.floor(Math.random() * QUIZ_BANK.length)];
        setQuiz(fallback);
        addNotification({
            type: "error",
            message:
                "서버에서 퀴즈를 불러오지 못해, 기본 퀴즈를 보여드릴게요.",
        });
    }
}

function initQuiz() {
    if (!quizContainer) return;
    const saved = load(DADAM_KEYS.QUIZ_STATE, null);

    if (saved) {
        setQuiz(saved);
        if (saved.answered && quizFeedbackEl) {
            quizFeedbackEl.textContent = saved.correct
                ? "정답이에요! ✨ " + saved.explanation
                : "정답은 '" +
                saved.options[saved.correctIndex] +
                "' 이에요. " +
                saved.explanation;
        }
    } else {
        fetchQuizFromServer();
    }
}

/* 퀴즈 선택 처리 (위임) */
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".quiz-option");
    if (!btn || !quizContainer) return;

    const state = load(DADAM_KEYS.QUIZ_STATE, null);
    if (!state) return;

    const index = Number(btn.dataset.index);
    const isCorrect = index === state.correctIndex;

    const allBtns = quizOptionsList?.querySelectorAll(".quiz-option") || [];
    allBtns.forEach((b) => {
        b.classList.remove("correct", "wrong");
    });

    if (isCorrect) {
        btn.classList.add("correct");
        if (quizFeedbackEl) {
            quizFeedbackEl.textContent =
                "정답이에요! ✨ " + state.explanation;
        }
    } else {
        btn.classList.add("wrong");
        const correctBtn = Array.from(allBtns).find(
            (b) => Number(b.dataset.index) === state.correctIndex
        );
        correctBtn?.classList.add("correct");
        if (quizFeedbackEl) {
            quizFeedbackEl.textContent =
                "아惜! 정답은 '" +
                state.options[state.correctIndex] +
                "' 이에요. " +
                state.explanation;
        }
    }

    save(DADAM_KEYS.QUIZ_STATE, {
        ...state,
        answered: true,
        correct: isCorrect,
    });

    addNotification({
        type: "info",
        message: "신조어 퀴즈를 풀었어요.",
    });
});

/* 다른 퀴즈 버튼 */
regenQuizBtn?.addEventListener("click", () => {
    fetchQuizFromServer();
});

/* -----------------------------------------------------
   🧷 초기 진입 시 실행
----------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    syncMeToFamily();
    initBalanceGame();
    initQuiz();
});
