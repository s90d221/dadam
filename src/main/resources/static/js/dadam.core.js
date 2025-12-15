/* =====================================================
   dadam.core.js
   - 유저 정보 / 공통 상수
   - 인증 토큰 관리 (메모리 기반)
   - 알림(Notification) 시스템
   - 모달 시스템 (열기/닫기 + ESC)
===================================================== */

/* 공통 API 기본 경로 (전역으로 한 번만 선언) */
const API_BASE = "/api/v1";

/* -----------------------------------------------------
   🔐 Auth API 헬퍼
----------------------------------------------------- */

async function authPost(path, payload) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

    if (!res.ok) { // 👈 400, 401, 500 등의 오류 응답
        let msg = "요청에 실패했어요.";
        try {
            const err = await res.json();
            msg = err.message || err.errorCode || msg; // 서버 오류 메시지를 가져옴

            // 💡 [수정됨] 400 또는 401일 때, ID/PW 관련 오류를 일반적인 사용자 친화적 메시지로 덮어씁니다.
            if (res.status === 401 || res.status === 400) {
                // 백엔드에서 온 '비밀번호가 일치하지 않습니다.' 메시지를 대신할 메시지
                msg = "이메일이나 비밀번호를 다시 확인하세요.";
            }

        } catch (_) {}

            addNotification?.({
                type: "error",
                message: msg,
            });

            throw new Error(`Auth ${path} 실패: ${msg}`);
        }

        try {
            return await res.json();
        } catch (parseErr) {
            throw new Error("응답을 읽는 중 문제가 발생했어요.");
        }
    } catch (networkErr) {
        const fallbackMsg =
            networkErr?.message || "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

        addNotification?.({
            type: "error",
            message: fallbackMsg, // 👈 알림 팝업 (Notification) 출력
        });

        // 💡 예외를 던짐 (dadam.auth.js의 catch 블록으로 전달됨)
        throw new Error(`Auth ${path} 실패: ${fallbackMsg}`);
    }
}

/* -----------------------------------------------------
   📌 공통 상수 & 메모리 저장 키
----------------------------------------------------- */

const DADAM_KEYS = {
    USER_PROFILE: "dadam_user_profile",
    NOTIFICATIONS: "dadam_notifications",
    ANSWERS: "dadam_answers",
    COMMENTS: "dadam_comments",
    BALANCE_GAME: "dadam_balance_game",
    QUIZ_STATE: "dadam_quiz_state",
    AUTH_TOKEN: "dadam_auth_token",
    EVENTS: "dadam_events",
};

// ⚡️ 로컬스토리지 대신 사용하는 메모리 저장소
const memoryStore = {};

const INTRO_MODAL_ID = "modal-intro";

const AUTH_MODAL_IDS = ["modal-login", "modal-signup"];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

/* -----------------------------------------------------
   🔄 계정 교체 시 초기화해야 할 유저별 상태
----------------------------------------------------- */
function clearUserScopedStorage() {
    const userScopedKeys = [
        DADAM_KEYS.USER_PROFILE,
        DADAM_KEYS.ANSWERS,
        DADAM_KEYS.COMMENTS,
        DADAM_KEYS.BALANCE_GAME,
        DADAM_KEYS.QUIZ_STATE,
        DADAM_KEYS.EVENTS,
        DADAM_KEYS.NOTIFICATIONS,
    ];

    userScopedKeys.forEach((key) => {
        clearPersistedKey(key);
    });
}

/* -----------------------------------------------------
   👤 아바타 라벨 헬퍼 (이름 → "수진", "엄마" 등)
----------------------------------------------------- */
function getAvatarLabel(rawName) {
    if (!rawName) return "가족";
    const name = String(rawName).trim();
    if (!name) return "가족";

    const parts = name.split(/\s+/);
    const last = parts[parts.length - 1];

    if (/^[가-힣]+$/.test(last)) {
        if (last.length <= 2) return last;
        if (last.length === 3) return last.slice(1);
        return last;
    }

    if (last.length <= 3) return last;
    return last.slice(0, 3);
}

/* -----------------------------------------------------
   👤 아바타 공통 데이터 & HTML 빌더
----------------------------------------------------- */

function getAvatarData(userId, userName, explicitAvatarUrl) {
    if (explicitAvatarUrl) {
        return {
            name: userName || "가족",
            avatarUrl: explicitAvatarUrl,
        };
    }

    if (typeof currentUser !== "undefined" && currentUser) {
        if (
            currentUser.id != null &&
            userId != null &&
            String(currentUser.id) === String(userId)
        ) {
            return {
                name: currentUser.name || userName || "나",
                avatarUrl: currentUser.avatarUrl || null,
            };
        }
    }

    if (
        typeof DADAM_FAMILY !== "undefined" &&
        DADAM_FAMILY &&
        userId &&
        DADAM_FAMILY[userId]
    ) {
        const fam = DADAM_FAMILY[userId];
        return {
            name: fam.name || userName || "가족",
            avatarUrl: fam.avatarUrl || null,
        };
    }

    return {
        name: userName || "가족",
        avatarUrl: null,
    };
}

function buildAvatarHtml({
                             userId = null,
                             userName = "",
                             avatarUrl = null,
                             size = "sm",
                             variant = "default",
                         } = {}) {
    const { name, avatarUrl: resolvedUrl } = getAvatarData(
        userId,
        userName,
        avatarUrl
    );
    const label = getAvatarLabel(name);

    const classes = ["avatar", `avatar-${size}`];
    if (variant === "soft") classes.push("avatar-soft");
    if (variant === "accent") classes.push("avatar-accent");

    const style = resolvedUrl
        ? ` style="background-image:url('${resolvedUrl}');background-size:cover;background-position:center;"`
        : "";

    const initial = resolvedUrl ? "" : label;

    return `
      <span class="${classes.join(" ")}"${style}>
        <span class="avatar-initial">${initial}</span>
      </span>
    `;
}

/* -----------------------------------------------------
   👤 기본 유저 정보 (처음 접속 시 자동 생성)
----------------------------------------------------- */

const defaultProfile = {
    id: null,
    name: "",
    avatarUrl: null,
    role: null,
    familyRole: null,
    familyCode: "",
    email: "",
};

let currentUser = { ...defaultProfile };

function setCurrentUser(profile = {}) {
    const resolvedName = (() => {
        const incoming = profile.name;
        if (typeof incoming === "string" && incoming.trim().length > 0) {
            return incoming;
        }

        const existing = currentUser.name;
        if (typeof existing === "string" && existing.trim().length > 0) {
            return existing;
        }

        return "";
    })();

    currentUser = {
        id: profile.id ?? currentUser.id ?? null,
        name: resolvedName,
        avatarUrl:
            profile.avatarUrl ??
            profile.avatar ??
            profile.profileImageUrl ??
            currentUser.avatarUrl ??
            null,
        role: profile.role ?? profile.familyRole ?? currentUser.role ?? null,
        familyRole: profile.familyRole ?? currentUser.familyRole ?? null,
        familyCode: profile.familyCode ?? currentUser.familyCode ?? "",
        email: profile.email ?? currentUser.email ?? "",
    };

    applyCurrentUserToHeader();

    save(DADAM_KEYS.USER_PROFILE, currentUser);
}

function applyCurrentUserToHeader() {
    const nameEl = document.getElementById("current-username");
    const avatarWrapper = document.getElementById("current-avatar");

    if (!avatarWrapper) return;

    const name = currentUser?.name || "내 프로필";
    const avatarUrl =
        currentUser?.avatarUrl || currentUser?.profileImageUrl || null;

    if (nameEl) {
        nameEl.textContent = name;
    }

    const html = buildAvatarHtml({
        userId: currentUser?.id ?? null,
        userName: name,
        avatarUrl,
        size: "sm",
    });

    avatarWrapper.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", () => {
    applyCurrentUserToHeader();
});

/* -----------------------------------------------------
   💾 로컬스토리지 헬퍼
----------------------------------------------------- */

function save(key, value) {
    memoryStore[key] = value;

    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        console.warn("[storage] save failed", err);
    }
}

function load(key, fallback = null) {
    if (Object.prototype.hasOwnProperty.call(memoryStore, key)) {
        return memoryStore[key];
    }

    try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
            const parsed = JSON.parse(raw);
            memoryStore[key] = parsed;
            return parsed;
        }
    } catch (err) {
        console.warn("[storage] load failed", err);
    }

    return fallback;
}

function clearPersistedKey(key) {
    delete memoryStore[key];
    try {
        localStorage.removeItem(key);
    } catch (err) {
        console.warn("[storage] remove failed", err);
    }
}

/* -----------------------------------------------------
   🔐 인증 토큰 헬퍼
----------------------------------------------------- */

let authToken = null;

function getAuthToken() {
    if (authToken) return authToken;

    const stored = load(DADAM_KEYS.AUTH_TOKEN, null);
    authToken = stored || null;
    return authToken;
}

function setAuthToken(token) {
    authToken = token || null;

    if (authToken) {
        save(DADAM_KEYS.AUTH_TOKEN, authToken);
    } else {
        clearPersistedKey(DADAM_KEYS.AUTH_TOKEN);
    }
}

function isLoggedIn() {
    return !!getAuthToken();
}

/* 화면 블러 + 로그인 강제 상태 전환 */
function setAuthUiState(loggedIn) {
    const appEl = document.querySelector(".app");
    if (!appEl) return;

    if (loggedIn) {
        appEl.classList.remove("is-blurred");
        AUTH_MODAL_IDS.forEach((id) => closeModal(id));
        closeModal(INTRO_MODAL_ID);
    } else {
        appEl.classList.add("is-blurred");
        closeModal(INTRO_MODAL_ID);
        openModal("modal-login");
    }
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
    renderActivityList();
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

function renderActivityList(limit = 3) {
    const list = load(DADAM_KEYS.NOTIFICATIONS, []);
    const container = document.getElementById("activity-list");
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = `
      <li class="activity-item activity-empty">
        <div class="activity-text">
          <p class="activity-title">아직 표시할 활동이 없어요.</p>
          <p class="activity-meta">가족과 함께 첫 활동을 남겨 보세요.</p>
        </div>
      </li>
    `;
        return;
    }

    const iconMap = {
        success: "✔",
        error: "!",
        danger: "!",
        warning: "!",
        info: "茶",
    };

    container.innerHTML = list
        .slice(0, limit)
        .map((item) => {
            const symbol = iconMap[item.type] || "茶";
            const toneClass = item.type ? `activity-${item.type}` : "";

            return `
        <li class="activity-item ${toneClass}">
          <span class="activity-icon">${symbol}</span>
          <div class="activity-text">
            <p class="activity-title">${item.message}</p>
            <p class="activity-meta">${item.time}</p>
          </div>
        </li>
      `;
        })
        .join("");
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

/* ESC로 닫기 – 로그인 강제 중엔 auth 모달은 닫히지 않음 */
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal-backdrop.is-active").forEach((m) => {
            if (AUTH_MODAL_IDS.includes(m.id) && !isLoggedIn()) return;
            m.classList.remove("is-active");
        });
    }
});

/* 모달 닫기 버튼 */
document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-close-modal]");
    if (!btn) return;
    const targetId = btn.dataset.closeModal;
    if (AUTH_MODAL_IDS.includes(targetId) && !isLoggedIn()) {
        return;
    }
    closeModal(targetId);

    if (!isLoggedIn() && targetId && AUTH_MODAL_IDS.includes(targetId)) {
        showIntroModal();
    }
});

/* 모달 바깥 클릭 시 닫기 – auth는 로그인 전이면 유지 */
document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("modal-backdrop")) return;
    if (AUTH_MODAL_IDS.includes(e.target.id) && !isLoggedIn()) return;
    if (e.target.id === INTRO_MODAL_ID && !isLoggedIn()) return;
    e.target.classList.remove("is-active");
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
   👤 프로필 / 로그인 모달 오픈
----------------------------------------------------- */

$("#open-profile")?.addEventListener("click", () => {
    if (!isLoggedIn()) {
        setAuthUiState(false);
        return;
    }

    $("#profile-name-input").value = currentUser.name || "";
    $("#profile-role-input").value =
        currentUser.familyRole || currentUser.role || "";

    const avatarWrapper = $("#profile-avatar-preview");
    if (avatarWrapper) {
        const label = getAvatarLabel(currentUser.name || "나");
        avatarWrapper.innerHTML = `<span class="avatar-initial">${label}</span>`;
        if (currentUser.avatar) {
            avatarWrapper.style.backgroundImage = `url(${currentUser.avatar})`;
            avatarWrapper.style.backgroundSize = "cover";
            avatarWrapper.style.backgroundPosition = "center";
        } else {
            avatarWrapper.style.backgroundImage = "none";
        }
    }

    openModal("modal-profile");
});

$("#open-auth")?.addEventListener("click", () => {
    openModal("modal-login");
});

function showIntroModal(keepAuthOpen = false) {
    const appEl = document.querySelector(".app");
    if (appEl) {
        appEl.classList.add("is-blurred");
    }

    if (!keepAuthOpen) {
        closeModal("modal-login");
    }
    closeModal("modal-signup");
    openModal(INTRO_MODAL_ID);
}

window.showIntroModal = showIntroModal;

/* -----------------------------------------------------
   🧪 알림 테스트 함수 (디버깅용)
----------------------------------------------------- */

window.dadamNotify = function (msg) {
    addNotification({ type: "info", message: msg });
    console.log("알림 추가:", msg);
};

/* -----------------------------------------------------
   👨‍👩‍👧‍👦 프로필 모달 내 가족 코드 / 로그아웃
----------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    const persistedToken = load(DADAM_KEYS.AUTH_TOKEN, null);
    if (persistedToken) {
        authToken = persistedToken;
    }

    const persistedUser = load(DADAM_KEYS.USER_PROFILE, null);
    if (persistedUser) {
        currentUser = { ...defaultProfile, ...persistedUser };
        applyCurrentUserToHeader();
    } else {
        applyCurrentUserToHeader();
    }

    // 처음 진입 시: 로그인 안 돼 있으면 블러 + 로그인 모달
    setAuthUiState(isLoggedIn());

    renderActivityList();

    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn?.addEventListener("click", () => {
        setAuthToken(null);
        clearUserScopedStorage();
        currentUser = { ...defaultProfile };
        applyCurrentUserToHeader();
        closeModal("modal-profile");
        setAuthUiState(false);
        addNotification({
            type: "info",
            message: "로그아웃되었어요.",
        });

        renderActivityList();

        // ✅ 로그아웃 후 퀴즈 상태도 초기화 (다음 로그인 계정 기준으로 다시 로드)
        if (typeof window.resetQuizForCurrentUser === "function") {
            window.resetQuizForCurrentUser();
        }

        if (typeof window.clearAnswerSession === "function") {
            window.clearAnswerSession();
        }

        window.DADAM_FAMILY = {};
        window.DADAM_FAMILY_COUNT = 0;
    });
});
