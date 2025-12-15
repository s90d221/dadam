/* =====================================================
   가족 멤버 목록 동적 렌더링
   - 백엔드: GET /api/v1/users/family
   - DTO: { id, email, name, familyRole, familyCode, avatarUrl }
===================================================== */

const FAMILY_MEMBERS_API_URL = "/api/v1/users/family";
const FAMILY_MAX_MEMBERS = 10;
let latestFamilyMembers = [];
const familyGridEl = document.getElementById("family-grid");
const inviteCodeInput = document.getElementById("invite-code-value");
const inviteFamilyListEl = document.getElementById("invite-family-list");
const inviteFamilyCountEl = document.getElementById("invite-family-count");

function normalizeFamilyCode(value) {
    return (value ?? "").toString().trim();
}

/* -----------------------------------------------------
   🔹 공통 API GET (Bearer 토큰 포함)
----------------------------------------------------- */
async function familyApiGet(url) {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : "",
        },
    });

    if (res.status === 401) {
        addNotification?.({
            type: "error",
            message: "로그인이 필요합니다.",
        });
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

async function familyApiPost(url) {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
        },
    });

    if (res.status === 401) {
        addNotification?.({
            type: "error",
            message: "로그인이 필요합니다.",
        });
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

/* -----------------------------------------------------
   🔹 familyRole → 뱃지 텍스트
----------------------------------------------------- */
function getFamilyRoleLabel(role, isMe) {
    if (isMe) return "Me";

    if (!role) return "Member";

    switch (role.toLowerCase()) {
        case "parent":
            return "Parent";
        case "child":
            return "Child";
        case "grandparent":
            return "Grandparent";
        default:
            return "Member";
    }
}

/* -----------------------------------------------------
   🔹 백엔드 DTO → 프론트 렌더링용 데이터 정규화
----------------------------------------------------- */
function normalizeFamilyMembers(rawList) {
    if (!Array.isArray(rawList)) return [];

    const currentUserId =
        typeof currentUser !== "undefined" && currentUser
            ? currentUser.id
            : null;

    return rawList.map((raw) => {
        const isMe = raw.id === currentUserId;

        return {
            userId: raw.id,
            email: raw.email,
            displayName: raw.name || "가족",
            familyRole: raw.familyRole || "member",
            familyCode: normalizeFamilyCode(raw.familyCode),
            avatarUrl: raw.avatarUrl,
            isMe,
        };
    });
}

function filterMembersByMyFamilyCode(members) {
    if (!Array.isArray(members) || members.length === 0) return [];

    const myCode = normalizeFamilyCode((currentUser && currentUser.familyCode) || "");
    if (!myCode) return members;

    const filtered = members.filter(
        (m) => normalizeFamilyCode(m.familyCode) === myCode
    );
    return filtered.length > 0 ? filtered : members;
}

function syncFamilyGlobals(members) {
    latestFamilyMembers = members;

    const map = {};
    members.forEach((m) => {
        if (m.userId == null) return;
        map[String(m.userId)] = {
            name: m.displayName,
            avatarUrl: m.avatarUrl,
            familyRole: m.familyRole,
            email: m.email,
            familyCode: m.familyCode,
        };
    });

    window.DADAM_FAMILY = map;
    window.DADAM_FAMILY_COUNT = members.length;

    if (typeof window.refreshAnswerProgressWithCurrentFamily === "function") {
        window.refreshAnswerProgressWithCurrentFamily();
    }
}

/* -----------------------------------------------------
   🔹 멤버 1개 렌더링 (avatar + 이름 + role)
----------------------------------------------------- */
function buildFamilyCellHtml(member) {
    const { userId, displayName, avatarUrl, familyRole, isMe } = member;

    // avatar 공통 유틸 함수 그대로 활용
    const avatarHtml =
        typeof buildAvatarHtml === "function"
            ? buildAvatarHtml({
                userId,
                userName: displayName,
                avatarUrl,
                size: "md",
                variant: isMe ? "accent" : "",
            })
            : `
              <span class="avatar avatar-md">
                <span class="avatar-initial">${getAvatarLabel(displayName)}</span>
              </span>
            `;

    const roleLabel = getFamilyRoleLabel(familyRole, isMe);

    return `
      <button class="family-cell" type="button" data-user-id="${userId}">
        <span class="family-cell-avatar">${avatarHtml}</span>
        <span class="family-meta">
          <span class="family-name">${displayName}</span>
          <span class="family-role-badge">${roleLabel}</span>
        </span>
      </button>
    `;
}

/* -----------------------------------------------------
   🔹 '멤버 추가' 버튼
----------------------------------------------------- */
function buildFamilyAddCellHtml(canAddMore) {
    if (!canAddMore) return "";

    return `
<!--      <button class="family-cell family-add" id="family-add-btn" type="button">-->
<!--        <span class="avatar avatar-md avatar-dashed">-->
<!--          <span class="fh-icon-plus"></span>-->
<!--        </span>-->
<!--        <span class="family-name">멤버 추가</span>-->
<!--      </button>-->
    `;
}

/* -----------------------------------------------------
   🔹 실제 family-grid 렌더링
----------------------------------------------------- */
function renderFamilyGrid(members) {
    if (!familyGridEl) return;

    const cellsHtml = members.map(buildFamilyCellHtml).join("");
    const addCellHtml = buildFamilyAddCellHtml(
        members.length < FAMILY_MAX_MEMBERS
    );

    familyGridEl.innerHTML = cellsHtml + addCellHtml;

    // “멤버 추가” 클릭 이벤트
    document.getElementById("family-add-btn")?.addEventListener("click", () => {
        document.getElementById("open-invite")?.click();
    });

    familyGridEl.querySelectorAll(".family-cell").forEach((btn) => {
        const userId = btn.dataset.userId;
        if (!userId || btn.classList.contains("family-add")) return;
        btn.addEventListener("click", () => openFamilyProfile(userId));
    });
}

function resolveFamilyMember(userId) {
    if (!userId) return null;

    const currentId = currentUser?.id;
    const fromLatest = (latestFamilyMembers || []).find(
        (m) => String(m.userId) === String(userId)
    );

    if (fromLatest) return fromLatest;

    const fromMap = window.DADAM_FAMILY?.[String(userId)];
    if (fromMap) {
        return {
            userId,
            displayName: fromMap.name,
            avatarUrl: fromMap.avatarUrl,
            familyRole: fromMap.familyRole,
            email: fromMap.email,
            familyCode: fromMap.familyCode,
            isMe: currentId != null && String(currentId) === String(userId),
        };
    }

    return null;
}

function renderFamilyProfile(member) {
    const avatarEl = document.getElementById("family-profile-avatar");
    const nameEl = document.getElementById("family-profile-name");
    const roleEl = document.getElementById("family-profile-role");
    const emailEl = document.getElementById("family-profile-email");
    const codeEl = document.getElementById("family-profile-code");

    if (!member || !avatarEl || !nameEl || !roleEl || !emailEl || !codeEl) {
        return;
    }

    const avatarHtml =
        typeof buildAvatarHtml === "function"
            ? buildAvatarHtml({
                userId: member.userId,
                userName: member.displayName,
                avatarUrl: member.avatarUrl,
                size: "lg",
                variant: member.isMe ? "accent" : "",
            })
            : `<span class="avatar avatar-lg">${member.displayName?.slice(0, 2) ||
            "가족"}</span>`;

    avatarEl.innerHTML = avatarHtml;
    nameEl.textContent = member.displayName || "우리 가족";
    roleEl.textContent = getFamilyRoleLabel(member.familyRole, member.isMe);
    emailEl.textContent = member.email || "이메일 정보가 없습니다.";
    codeEl.textContent = member.familyCode || "가족 코드 없음";
}

function openFamilyProfile(userId) {
    const member = resolveFamilyMember(userId);
    if (!member) {
        addNotification?.({
            type: "warning",
            message: "가족 정보를 불러오지 못했습니다.",
        });
        return;
    }

    renderFamilyProfile(member);

    if (typeof openModal === "function") {
        openModal("modal-family-profile");
    }
}

window.openFamilyProfile = openFamilyProfile;

/* -----------------------------------------------------
   🔹 서버에서 가족 멤버 목록 가져오기
----------------------------------------------------- */
async function fetchAndRenderFamilyMembers() {
    try {
        const raw = await familyApiGet(FAMILY_MEMBERS_API_URL);
        const members = normalizeFamilyMembers(raw);
        const filtered = filterMembersByMyFamilyCode(members);

        syncFamilyGlobals(filtered);
        renderFamilyGrid(filtered);
    } catch (e) {
        console.error("[FAMILY] load error:", e);

        addNotification?.({
            type: "error",
            message: "가족 정보를 불러오지 못했습니다.",
        });

        // 최소한 '멤버 추가' 버튼이라도
        renderFamilyGrid([]);
    }
}

window.fetchAndRenderFamilyMembers = fetchAndRenderFamilyMembers;

/* -----------------------------------------------------
   🔹 초대 모달 렌더링
----------------------------------------------------- */
function renderInviteFamilyMembers(members) {
    if (!inviteFamilyListEl) return;

    const cellsHtml = members.map(buildFamilyCellHtml).join("");
    inviteFamilyListEl.innerHTML = cellsHtml ||
        `<div class="empty-placeholder">아직 가족이 없어요. 초대 코드를 공유해 보세요!</div>`;

    if (inviteFamilyCountEl) {
        const count = members.length;
        const label = count > 0 ? `${count}명` : "구성원 없음";
        inviteFamilyCountEl.textContent = `${label} / 최대 ${FAMILY_MAX_MEMBERS}명`;
    }
}

async function openFamilyInviteModal() {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;
    if (!token) {
        addNotification?.({
            type: "warning",
            message: "로그인 후 초대 코드를 확인할 수 있어요.",
        });
        if (typeof setAuthUiState === "function") {
            setAuthUiState(false);
        }
        return;
    }
    try {
        const [codeResp, familyRaw] = await Promise.all([
            familyApiPost("/api/v1/users/me/family-code"),
            familyApiGet(FAMILY_MEMBERS_API_URL),
        ]);

        const members = filterMembersByMyFamilyCode(
            normalizeFamilyMembers(familyRaw)
        );

        if (inviteCodeInput) {
            inviteCodeInput.value = codeResp.familyCode || "";
        }

        renderInviteFamilyMembers(members);

        if (typeof openModal === "function") {
            openModal("modal-invite");
        }
    } catch (e) {
        console.error("[FAMILY] invite modal error:", e);
        addNotification?.({
            type: "error",
            message: "초대 코드를 불러오지 못했습니다. 로그인 상태를 확인해 주세요.",
        });
    }
}

window.openFamilyInviteModal = openFamilyInviteModal;

document.getElementById("copy-invite-code")?.addEventListener("click", async () => {
    const code = inviteCodeInput?.value?.trim();
    if (!code) {
        addNotification?.({
            type: "warning",
            message: "발급된 초대 코드가 없습니다.",
        });
        return;
    }

    try {
        await navigator.clipboard.writeText(code);
        addNotification?.({
            type: "info",
            message: "초대 코드를 복사했어요!",
        });
    } catch (err) {
        console.error("[FAMILY] copy failed", err);
        addNotification?.({
            type: "error",
            message: "코드를 복사하지 못했습니다. 브라우저 권한을 확인해 주세요.",
        });
    }
});

/* -----------------------------------------------------
   🔹 페이지 로딩 시 자동 실행
----------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    fetchAndRenderFamilyMembers();
});
