/* =====================================================
   가족 멤버 목록 동적 렌더링
   - 백엔드: GET /api/v1/users/family
   - DTO: { id, email, name, familyRole, familyCode, avatarUrl }
===================================================== */

const FAMILY_MEMBERS_API_URL = "/api/v1/users/family";
const familyGridEl = document.getElementById("family-grid");
const inviteCodeInput = document.getElementById("invite-code-value");
const inviteFamilyListEl = document.getElementById("invite-family-list");
const inviteFamilyCountEl = document.getElementById("invite-family-count");

/* -----------------------------------------------------
   🔹 공통 API GET (Bearer 토큰 포함)
----------------------------------------------------- */
async function familyApiGet(url) {
    const token = localStorage.getItem("dadam_auth_token");

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
        throw new Error("401 Unauthorized");
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GET ${url} 실패: ${text}`);
    }

    return res.json();
}

async function familyApiPost(url) {
    const token = localStorage.getItem("dadam_auth_token");

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
            familyCode: raw.familyCode,
            avatarUrl: raw.avatarUrl,
            isMe,
        };
    });
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
        ${avatarHtml}
        <span class="family-name">${displayName}</span>
<!--        <span class="family-role-badge">${roleLabel}</span>-->
      </button>
    `;
}

/* -----------------------------------------------------
   🔹 '멤버 추가' 버튼
----------------------------------------------------- */
function buildFamilyAddCellHtml() {
    return `
      <button class="family-cell family-add" id="family-add-btn" type="button">
        <span class="avatar avatar-md avatar-dashed">
          <span class="fh-icon-plus"></span>
        </span>
        <span class="family-name">추가</span>
      </button>
    `;
}

/* -----------------------------------------------------
   🔹 실제 family-grid 렌더링
----------------------------------------------------- */
function renderFamilyGrid(members) {
    if (!familyGridEl) return;

    const cellsHtml = members.map(buildFamilyCellHtml).join("");
    const addCellHtml = buildFamilyAddCellHtml();

    familyGridEl.innerHTML = cellsHtml + addCellHtml;

    // “멤버 추가” 클릭 이벤트
    document.getElementById("family-add-btn")?.addEventListener("click", () => {
        document.getElementById("open-invite")?.click();
    });
}

/* -----------------------------------------------------
   🔹 서버에서 가족 멤버 목록 가져오기
----------------------------------------------------- */
async function fetchAndRenderFamilyMembers() {
    try {
        const raw = await familyApiGet(FAMILY_MEMBERS_API_URL);
        const members = normalizeFamilyMembers(raw);

        renderFamilyGrid(members);
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
        inviteFamilyCountEl.textContent =
            count > 0 ? `${count}명` : "구성원 없음";
    }
}

async function openFamilyInviteModal() {
    try {
        const [codeResp, familyRaw] = await Promise.all([
            familyApiPost("/api/v1/users/me/family-code"),
            familyApiGet(FAMILY_MEMBERS_API_URL),
        ]);

        const members = normalizeFamilyMembers(familyRaw);

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
