/* =====================================================
   dadam.profile.js (백엔드 API 기반 + 공통 아바타 헬퍼 사용)
===================================================== */

// 전역 currentUser, setCurrentUser, getAuthToken 은 dadam.core.js 에서 정의됨을 전제로 함

/* -----------------------------------------------------
   DOM 요소
----------------------------------------------------- */
const profileForm = document.getElementById("profile-form");
const profileImageInput = document.getElementById("profile-image-input");
const profileNameInput = document.getElementById("profile-name-input");
const profileRoleInput = document.getElementById("profile-role-input");
const profileFamilyCodeInput = document.getElementById("family-code-input");
const profileFamilyCodeDisplay = document.getElementById("family-code-display");
const profileAvatarPreview = document.getElementById("profile-avatar-preview");

const headerAvatar = document.getElementById("current-avatar");
const headerUsername = document.getElementById("current-username");

/* -----------------------------------------------------
   내부 헬퍼: currentUser에서 이름/아바타 URL 추출
----------------------------------------------------- */
function getCurrentUserAvatarInfo(defaultNameForProfile = "우리 가족") {
    const name = currentUser?.name || defaultNameForProfile;

    // 백엔드에서 어떤 이름으로 내려오는지에 따라 확장
    const avatarUrl =
        currentUser?.avatarUrl ||
        currentUser?.profileImageUrl ||
        currentUser?.imageUrl ||
        null;

    return { name, avatarUrl };
}

/* -----------------------------------------------------
   UI 반영 함수 (공통 아바타 헬퍼 사용)
   - 사진이 있으면: 배경 이미지
   - 없으면: 이름에서 2글자 이니셜
----------------------------------------------------- */
function updateAvatarVisuals() {
    // 헤더 이름 텍스트
    if (headerUsername) {
        headerUsername.textContent =
            (window.currentUser && window.currentUser.name) || "우리 가족";
    }

    // 1) 헤더 아바타
    if (headerAvatar) {
        const { name, avatarUrl } = getCurrentUserAvatarInfo("우리 가족");

        const label =
            typeof getAvatarLabel === "function"
                ? getAvatarLabel(name)
                : (name || "가족").slice(0, 2);

        // 사진이 있으면 클래스 플래그 추가
        if (avatarUrl) {
            headerAvatar.style.backgroundImage = `url(${avatarUrl})`;
            headerAvatar.style.backgroundSize = "cover";
            headerAvatar.style.backgroundPosition = "center";
            headerAvatar.classList.add("has-avatar-image");
        } else {
            headerAvatar.style.backgroundImage = "none";
            headerAvatar.classList.remove("has-avatar-image");
        }

        // 텍스트는 항상 라벨로 세팅
        headerAvatar.innerHTML = `<span class="avatar-initial">${label}</span>`;
    }

    // 2) 프로필 모달 아바타
    if (profileAvatarPreview) {
        const { name, avatarUrl } = getCurrentUserAvatarInfo("나");

        const label =
            typeof getAvatarLabel === "function"
                ? getAvatarLabel(name)
                : (name || "나").slice(0, 2);

        if (avatarUrl) {
            profileAvatarPreview.style.backgroundImage = `url(${avatarUrl})`;
            profileAvatarPreview.style.backgroundSize = "cover";
            profileAvatarPreview.style.backgroundPosition = "center";
            profileAvatarPreview.classList.add("has-avatar-image");
        } else {
            profileAvatarPreview.style.backgroundImage = "none";
            profileAvatarPreview.classList.remove("has-avatar-image");
        }

        profileAvatarPreview.innerHTML = `<span class="avatar-initial">${label}</span>`;
    }
}


/* -----------------------------------------------------
   백엔드 API 통신
----------------------------------------------------- */

async function fetchProfile() {
    const token = getAuthToken();
    if (!token) return;

    const res = await fetch("/api/v1/users/me", {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
    });

    if (!res.ok) return;

    const data = await res.json();

    // 전역 currentUser를 백엔드 값으로 갱신
    if (typeof setCurrentUser === "function") {
        setCurrentUser(data);
    } else {
        window.currentUser = {
            ...(window.currentUser || {}),
            ...data,
        };
    }

    if (profileNameInput) {
        profileNameInput.value = currentUser?.name || "";
    }
    if (profileRoleInput) {
        profileRoleInput.value = currentUser?.familyRole || "child";
    }
    if (profileFamilyCodeInput) {
        profileFamilyCodeInput.value = currentUser?.familyCode || "";
    }
    if (profileFamilyCodeDisplay) {
        profileFamilyCodeDisplay.textContent = currentUser?.familyCode
            ? `내 코드: ${currentUser.familyCode}`
            : "코드 없음";
    }

    updateAvatarVisuals();
}

async function updateProfile(formData) {
    const token = getAuthToken();
    if (!token) return;

    const res = await fetch("/api/v1/users/me", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: formData,
    });

    if (!res.ok) return;

    const data = await res.json();

    if (typeof setCurrentUser === "function") {
        setCurrentUser(data);
    } else {
        window.currentUser = { ...(window.currentUser || {}), ...data };
    }

    if (profileFamilyCodeInput) {
        profileFamilyCodeInput.value = currentUser?.familyCode || "";
    }
    if (profileFamilyCodeDisplay) {
        profileFamilyCodeDisplay.textContent = currentUser?.familyCode
            ? `내 코드: ${currentUser.familyCode}`
            : "코드 없음";
    }

    if (typeof fetchAndRenderFamilyMembers === "function") {
        fetchAndRenderFamilyMembers();
    }

    updateAvatarVisuals();
}

async function uploadAvatar(file) {
    const token = getAuthToken();
    if (!token) return;

    const fd = new FormData();
    fd.append("avatar", file);

    const res = await fetch("/api/v1/users/me/avatar", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: fd,
    });

    if (!res.ok) return;

    const data = await res.json();

    if (typeof setCurrentUser === "function") {
        setCurrentUser(data);
    } else {
        window.currentUser = { ...(window.currentUser || {}), ...data };
    }

    updateAvatarVisuals();
}

async function deleteAvatar() {
    const token = getAuthToken();
    if (!token) return;

    const res = await fetch("/api/v1/users/me/avatar", {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
    });

    if (!res.ok) return;

    const data = await res.json();

    if (typeof setCurrentUser === "function") {
        setCurrentUser(data);
    } else {
        window.currentUser = { ...(window.currentUser || {}), ...data };
    }

    updateAvatarVisuals();
}

/* -----------------------------------------------------
   이벤트: 이미지 업로드 즉시 적용
----------------------------------------------------- */
profileImageInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadAvatar(file);
});

/* -----------------------------------------------------
   이벤트: 프로필 정보 저장
----------------------------------------------------- */
profileForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", profileNameInput.value.trim());
    formData.append("familyRole", profileRoleInput.value);

    // 🔹 가족 코드 입력값
    if (profileFamilyCodeInput) {
        const rawCode = profileFamilyCodeInput.value.trim();
        formData.append("familyCode", rawCode);
    }

    updateProfile(formData);
    closeModal("modal-profile");
});


/* -----------------------------------------------------
   초기 로딩 시 백엔드에서 프로필 받아오기
----------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    fetchProfile();
});
