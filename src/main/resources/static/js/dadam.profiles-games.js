/* =====================================================
   dadam.profiles-games.js
   - 프로필 이미지 업로드 / 저장 / 불러오기
   - 밸런스 게임 선택 로직
   - 신조어 퀴즈 선택 로직
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
   ⚖ 밸런스 게임 로직
----------------------------------------------------- */

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

const balanceContainer = document.getElementById("balance-game");
const balanceQuestionEl = document.getElementById("balance-question");
const balanceOptions = document.querySelectorAll(".balance-option");
const regenBalanceBtn = document.getElementById("regen-balance");

function pickRandomBalance() {
    const idx = Math.floor(Math.random() * BALANCE_POOL.length);
    return BALANCE_POOL[idx];
}

/* 저장된 밸런스 상태 불러오기 */
function loadBalanceState() {
    return load(DADAM_KEYS.BALANCE_GAME, null);
}

/* 밸런스 상태 저장 */
function saveBalanceState(state) {
    save(DADAM_KEYS.BALANCE_GAME, state);
}

/* 퍼센트 & 아바타 렌더링 */
function renderBalanceFromState(state) {
    if (!state) return;

    const votesA = state.votes?.A || [];
    const votesB = state.votes?.B || [];
    const total = votesA.length + votesB.length;

    const percentA = total === 0 ? 0 : Math.round((votesA.length / total) * 100);
    const percentB = total === 0 ? 0 : 100 - percentA;

    const barA = document.querySelector('[data-bar="A"]');
    const barB = document.querySelector('[data-bar="B"]');
    const labelA = document.querySelector('[data-percent="A"]');
    const labelB = document.querySelector('[data-percent="B"]');

    if (barA) barA.style.width = percentA + "%";
    if (barB) barB.style.width = percentB + "%";
    if (labelA) labelA.textContent = percentA + "%";
    if (labelB) labelB.textContent = percentB + "%";

    // 아바타 렌더링
    const avatarA = document.querySelector('[data-avatars="A"]');
    const avatarB = document.querySelector('[data-avatars="B"]');

    if (avatarA) {
        avatarA.innerHTML = votesA
            .map((uid) => {
                const info = DADAM_FAMILY[uid] || {
                    name: "가족",
                    initial: "가",
                };
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
                const info = DADAM_FAMILY[uid] || {
                    name: "가족",
                    initial: "가",
                };
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
    if (!balanceContainer) return;

    balanceContainer.dataset.gameId = game.id;
    if (balanceQuestionEl) balanceQuestionEl.textContent = game.question;

    // 텍스트 업데이트
    balanceOptions.forEach((btn) => {
        const choice = btn.dataset.choice;
        const textEl = btn.querySelector(".balance-text");
        if (choice === "A") textEl.textContent = game.A;
        if (choice === "B") textEl.textContent = game.B;
    });

    // 기존 상태가 있으면 그걸로 렌더링, 없으면 초기화
    if (existingState && existingState.id === game.id) {
        renderBalanceFromState(existingState);
    } else {
        const initState = {
            id: game.id,
            votes: { A: [], B: [] },
        };
        saveBalanceState(initState);
        renderBalanceFromState(initState);
    }
}

/* 밸런스 게임 초기화 */
function initBalanceGame() {
    if (!balanceContainer) return;

    const saved = loadBalanceState();
    let gameToUse;

    if (saved) {
        gameToUse = BALANCE_POOL.find((g) => g.id === saved.id) || pickRandomBalance();
    } else {
        gameToUse = pickRandomBalance();
    }

    setBalanceGame(gameToUse, saved);
}

/* 선택 처리 */
function handleBalanceChoice(choice) {
    const currentGameId = balanceContainer?.dataset.gameId;
    if (!currentGameId) return;

    let state = loadBalanceState();
    if (!state || state.id !== currentGameId) {
        state = {
            id: currentGameId,
            votes: { A: [], B: [] },
        };
    }

    const userId = "me"; // 실제로는 로그인 유저 ID로 대체
    // 다른 선택에서 제거
    state.votes.A = state.votes.A.filter((id) => id !== userId);
    state.votes.B = state.votes.B.filter((id) => id !== userId);
    // 현재 선택에 추가
    if (!state.votes[choice].includes(userId)) {
        state.votes[choice].push(userId);
    }

    saveBalanceState(state);
    renderBalanceFromState(state);

    const game = BALANCE_POOL.find((g) => g.id === state.id);
    const text = choice === "A" ? game?.A : game?.B;
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
    const newGame = pickRandomBalance();
    setBalanceGame(newGame, null);
    addNotification({
        type: "info",
        message: "새로운 밸런스 게임이 준비되었어요.",
    });
});


/* -----------------------------------------------------
   💬 신조어 퀴즈 로직
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
        explanation: "알아서 잘 딱 깔끔하고 센스 있게! 요즘 자주 쓰는 칭찬 표현이에요.",
    },
    {
        id: "chaemjem",
        question: "“재질”이라는 표현은 요즘 어떤 뜻으로 많이 쓸까요?",
        options: [
            "물건의 재료를 말할 때",
            "그 사람의 분위기/스타일이 마음에 든다는 뜻",
            "성격이 까칠하다는 뜻",
        ],
        correctIndex: 1,
        explanation: "“재질이다”는 그 사람의 분위기나 스타일이 취향이라는 뜻으로 많이 써요.",
    },
    {
        id: "kkaetok",
        question: "“깨톡”은 무엇의 줄임말일까요?",
        options: ["깨끗한 톡", "카카오톡", "깨어있는 토크"],
        correctIndex: 1,
        explanation: "“카카오톡”의 줄임말이에요. ‘깨톡했어?’ 이런 식으로 써요.",
    },
    {
        id: "manjjok",
        question: "“만찢남/만찢녀”에서 ‘만찢’은 무슨 뜻일까요?",
        options: [
            "만 원짜리 찢는 사람",
            "만화를 찢고 나온 것처럼 잘생기거나 예쁜 사람",
            "만큼 찢어지게 가난한 사람",
        ],
        correctIndex: 1,
        explanation:
            "“만찢”은 ‘만화를 찢고 나온’의 줄임말이에요. 만화 속 주인공처럼 생겼다는 뜻!",
    },
];

const quizContainer = document.getElementById("slang-quiz");
const quizQuestionEl = document.getElementById("quiz-question");
const quizOptionsList = document.getElementById("quiz-options");
const quizFeedbackEl = document.getElementById("quiz-feedback");
const regenQuizBtn = document.getElementById("regen-quiz");

function pickRandomQuiz() {
    const idx = Math.floor(Math.random() * QUIZ_BANK.length);
    return QUIZ_BANK[idx];
}

function setQuiz(quiz) {
    if (!quizContainer) return;

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

    // 퀴즈 상태 초기화
    const newState = {
        id: quiz.id,
        answered: false,
        correct: null,
    };
    save(DADAM_KEYS.QUIZ_STATE, newState);
}

function initQuiz() {
    if (!quizContainer) return;
    const saved = load(DADAM_KEYS.QUIZ_STATE, null);
    let quizToUse;

    if (saved) {
        quizToUse = QUIZ_BANK.find((q) => q.id === saved.id) || pickRandomQuiz();
    } else {
        quizToUse = pickRandomQuiz();
    }

    setQuiz(quizToUse);
}

/* 퀴즈 선택 처리 (위임) */
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".quiz-option");
    if (!btn || !quizContainer) return;

    const quizId = quizContainer.dataset.quizId;
    const quiz = QUIZ_BANK.find((q) => q.id === quizId);
    if (!quiz) return;

    const index = Number(btn.dataset.index);
    const isCorrect = index === quiz.correctIndex;

    // 모든 옵션 버튼 가져와서 스타일 리셋
    const allBtns = quizOptionsList?.querySelectorAll(".quiz-option") || [];
    allBtns.forEach((b) => {
        b.classList.remove("correct", "wrong");
    });

    // 선택 버튼 스타일
    if (isCorrect) {
        btn.classList.add("correct");
        if (quizFeedbackEl) {
            quizFeedbackEl.textContent = "정답이에요! ✨ " + quiz.explanation;
        }
    } else {
        btn.classList.add("wrong");
        const correctBtn = Array.from(allBtns).find(
            (b) => Number(b.dataset.index) === quiz.correctIndex
        );
        correctBtn?.classList.add("correct");
        if (quizFeedbackEl) {
            quizFeedbackEl.textContent = "아惜! 정답은 '" + quiz.options[quiz.correctIndex] + "' 이에요. " + quiz.explanation;
        }
    }

    // 상태 저장
    save(DADAM_KEYS.QUIZ_STATE, {
        id: quiz.id,
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
    const quiz = pickRandomQuiz();
    setQuiz(quiz);
    addNotification({
        type: "info",
        message: "새로운 신조어 퀴즈가 준비되었어요.",
    });
});


/* -----------------------------------------------------
   🧷 초기 진입 시 실행
----------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    syncMeToFamily();
    initBalanceGame();
    initQuiz();
});
