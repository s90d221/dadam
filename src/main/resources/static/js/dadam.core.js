/* =====================================================
   dadam.core.js
   - 유저 정보 / 공통 상수
   - 로컬스토리지 관리
   - 인증 토큰 관리
   - 알림(Notification) 시스템
   - 모달 시스템 (열기/닫기 + ESC)
===================================================== */

/* 공통 API 기본 경로 (전역으로 한 번만 선언) */
const API_BASE = "/api/v1";

/* -----------------------------------------------------
   📌 공통 상수 & 로컬 저장 키
----------------------------------------------------- */

const DADAM_KEYS = {
    USER_PROFILE: "dadam_user_profile",
    NOTIFICATIONS: "dadam_notifications",
    ANSWERS: "dadam_answers",
    COMMENTS: "dadam_comments",
    BALANCE_GAME: "dadam_balance_game",
    QUIZ_STATE: "dadam_quiz_state",
    AUTH_TOKEN: "dadam_auth_token", // 🔐 로그인 토큰 저장용
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);


/* -----------------------------------------------------
   👤 기본 유저 정보 (처음 접속 시 자동 생성)
----------------------------------------------------- */

function loadUserProfile() {
    const raw = localStorage.getItem(DADAM_KEYS.USER_PROFILE);
    if (raw) return JSON.parse(raw);

    const defaultProfile = {
        name: "나",
        avatar: "",
        role: "child",
    };

    localStorage.setItem(DADAM_KEYS.USER_PROFILE, JSON.stringify(defaultProfile));
    return defaultProfile;
}

let currentUser = loadUserProfile();


/* -----------------------------------------------------
   💾 로컬스토리지 헬퍼
----------------------------------------------------- */

function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function load(key, fallback = null) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
}


/* -----------------------------------------------------
   🔐 인증 토큰 헬퍼
----------------------------------------------------- */

function getAuthToken() {
    return localStorage.getItem(DADAM_KEYS.AUTH_TOKEN) || null;
}

function setAuthToken(token) {
    if (token) {
        localStorage.setItem(DADAM_KEYS.AUTH_TOKEN, token);
    } else {
        localStorage.removeItem(DADAM_KEYS.AUTH_TOKEN);
    }
}

function isLoggedIn() {
    return !!getAuthToken();
}


/* -----------------------------------------------------
   🔔 알림(Notification) 시스템
----------------------------------------------------- */

function addNotification({ type = "info", message }) {
    const list = load(DADAM_KEYS.NOTIFICATIONS, []);

    const newItem = {
        id: Date.now(),
        type,
        message,
        time: new Date().toLocaleString(),
    };

    list.unshift(newItem);
    save(DADAM_KEYS.NOTIFICATIONS, list);

    showNotificationBadge(true);
}

function showNotificationBadge(active) {
    const badge = $("#notification-badge");
    if (!badge) return;
    if (active) badge.classList.add("is-active");
    else badge.classList.remove("is-active");
}

function renderNotifications() {
    const list = load(DADAM_KEYS.NOTIFICATIONS, []);
    const container = $("#notification-list");
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<li class="empty">아직 알림이 없어요</li>`;
        showNotificationBadge(false);
        return;
    }

    container.innerHTML = list
        .map(
            (n) => `
        <li class="notification-item">
          <div class="notification-text">
            <p class="notification-msg">${n.message}</p>
            <p class="notification-time">${n.time}</p>
          </div>
        </li>
      `
        )
        .join("");

    showNotificationBadge(false);
}


/* -----------------------------------------------------
   🪟 모달 시스템 (Common)
----------------------------------------------------- */

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("is-active");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("is-active");
}

/* ESC로 닫기 */
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal-backdrop.is-active").forEach((m) => {
            m.classList.remove("is-active");
        });
    }
});

/* 모달 닫기 버튼 */
document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-close-modal]");
    if (!btn) return;
    closeModal(btn.dataset.closeModal);
});


/* -----------------------------------------------------
   🔔 알림 모달 오픈 버튼들
----------------------------------------------------- */

$("#open-notifications")?.addEventListener("click", () => {
    renderNotifications();
    openModal("modal-notifications");
});

$("#open-notifications-from-card")?.addEventListener("click", () => {
    renderNotifications();
    openModal("modal-notifications");
});


/* -----------------------------------------------------
   👤 프로필 & 로그인 모달 오픈
----------------------------------------------------- */

$("#open-profile")?.addEventListener("click", () => {
    // 기존 데이터 반영
    $("#profile-name-input").value = currentUser.name;
    $("#profile-role-input").value = currentUser.role;

    // 아바타 이미지
    const avatarPreview = $("#profile-avatar-preview");
    if (currentUser.avatar) {
        avatarPreview.style.backgroundImage = `url(${currentUser.avatar})`;
        avatarPreview.style.backgroundSize = "cover";
        avatarPreview.style.backgroundPosition = "center";
    } else {
        avatarPreview.style.backgroundImage = "none";
    }

    openModal("modal-profile");
});

$("#open-auth")?.addEventListener("click", () => {
    openModal("modal-auth");
});

/* 모달 바깥(배경) 클릭 시 닫기 */
document.addEventListener("click", (e) => {
    // 회색 배경(div.modal-backdrop)을 직접 클릭했을 때만 닫기
    if (!e.target.classList.contains("modal-backdrop")) return;

    // 해당 모달에서 is-active 제거
    e.target.classList.remove("is-active");
});

/* -----------------------------------------------------
   🧪 알림 테스트 함수 (디버깅용)
----------------------------------------------------- */

window.dadamNotify = function (msg) {
    addNotification({ type: "info", message: msg });
    console.log("알림 추가:", msg);
};
