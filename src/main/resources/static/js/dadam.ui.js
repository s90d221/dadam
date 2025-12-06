/* =====================================================
   dadam.ui.js
   - 11월(및 월 이동) 캘린더 렌더링
   - 약속 만들기 모달 & 일정 리스트
   - 로그인/회원가입 모달 탭 전환
   - 헤더 네비/부가 버튼 UX
===================================================== */

/* -----------------------------------------------------
   📌 로컬스토리지 키 보완 (이벤트용)
----------------------------------------------------- */

// core.js에서 만든 DADAM_KEYS에 일정용 키를 추가
if (!DADAM_KEYS.EVENTS) {
    DADAM_KEYS.EVENTS = "dadam_events";
}

/* -----------------------------------------------------
   📅 캘린더 / 일정 관련
----------------------------------------------------- */

const calendarTitleEl = document.getElementById("calendar-title");
const calendarGridEl = document.getElementById("calendar-grid");
const calendarPrevBtn = document.getElementById("calendar-prev");
const calendarNextBtn = document.getElementById("calendar-next");
const eventListEl = document.getElementById("event-list");

const scheduleModalId = "modal-schedule";
const scheduleForm = document.getElementById("schedule-form");
const scheduleTitleInput = document.getElementById("schedule-title");
const scheduleDateInput = document.getElementById("schedule-date");
const scheduleTimeInput = document.getElementById("schedule-time");
const schedulePlaceInput = document.getElementById("schedule-place");
const scheduleMemoInput = document.getElementById("schedule-memo");
const scheduleRemindInput = document.getElementById("schedule-remind");
const openScheduleModalBtn = document.getElementById("open-schedule-modal");

let calendarState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0~11
};

let selectedDateForSchedule = null;

/* ---- 일정 데이터 헬퍼 ---- */

function loadEvents() {
    return load(DADAM_KEYS.EVENTS, []);
}

function saveEvents(events) {
    save(DADAM_KEYS.EVENTS, events);
}

/* "2025-11-20" 처럼 yyyy-mm-dd 만들기 */
function formatDateKey(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/* 날짜 문자열 → Date */
function parseDateKey(dateKey) {
    const [y, m, d] = dateKey.split("-").map(Number);
    return new Date(y, m - 1, d);
}

/* ---- 캘린더 렌더링 ---- */

function renderCalendar(year, monthIndex) {
    if (!calendarGridEl || !calendarTitleEl) return;

    const firstDay = new Date(year, monthIndex, 1);
    const firstWeekday = firstDay.getDay(); // 0(일)~6(토)
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const events = loadEvents();

    // 타이틀: "2025년 11월"
    calendarTitleEl.textContent = `${year}년 ${monthIndex + 1}월`;

    // 기존 내용 비우기
    calendarGridEl.innerHTML = "";

    // 앞쪽 공백(지난달 자리)
    for (let i = 0; i < firstWeekday; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "calendar-cell calendar-cell-empty";
        calendarGridEl.appendChild(emptyCell);
    }

    const todayKey = formatDateKey(new Date());

    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, monthIndex, day);
        const dateKey = formatDateKey(cellDate);

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

        // 일정 유무 체크
        const todaysEvents = events.filter((ev) => ev.date === dateKey);

        const dotWrapper = document.createElement("div");
        if (todaysEvents.length > 0) {
            todaysEvents.slice(0, 2).forEach((ev) => {
                const dot = document.createElement("div");
                dot.className = "calendar-event-dot";
                // 간단 색 구분 (저녁/여행 용)
                if (ev.type === "trip") dot.classList.add("calendar-event-trip");
                else dot.classList.add("calendar-event-dinner");
                dotWrapper.appendChild(dot);
            });
        }

        cell.appendChild(dayNumberEl);
        cell.appendChild(dotWrapper);

        calendarGridEl.appendChild(cell);
    }
}

/* ---- 일정 리스트 렌더링 ---- */

function renderEventList() {
    if (!eventListEl) return;

    const events = loadEvents();
    if (events.length === 0) {
        eventListEl.innerHTML = `
      <article class="event-item">
        <div class="event-dot event-type-dinner"></div>
        <div class="event-text">
          <p class="event-title">등록된 가족 약속이 없어요.</p>
          <p class="event-meta">오른쪽 상단 "약속 만들기" 버튼으로 첫 약속을 남겨보세요.</p>
        </div>
      </article>
    `;
        return;
    }

    // 날짜순 정렬
    const sorted = events.slice().sort((a, b) => {
        if (a.date === b.date) return (a.time || "").localeCompare(b.time || "");
        return a.date.localeCompare(b.date);
    });

    eventListEl.innerHTML = sorted
        .map((ev) => {
            const dateObj = parseDateKey(ev.date);
            const m = dateObj.getMonth() + 1;
            const d = dateObj.getDate();
            const dateLabel = `${m}월 ${d}일`;
            const timeLabel = ev.time ? ` · ${ev.time}` : "";
            const placeLabel = ev.place ? ` · ${ev.place}` : "";

            const typeClass =
                ev.type === "trip" ? "event-type-trip" : "event-type-dinner";

            return `
        <article class="event-item" data-event-id="${ev.id}">
          <div class="event-dot ${typeClass}"></div>
          <div class="event-text">
            <p class="event-title">${ev.title}</p>
            <p class="event-meta">${dateLabel}${timeLabel}${placeLabel}</p>
          </div>
          ${
                ev.remind
                    ? `
            <button class="ghost-icon-btn event-remind-btn" type="button">
              <span class="fh-icon-bell-small"></span>
            </button>
          `
                    : ""
            }
        </article>
      `;
        })
        .join("");
}

/* ---- 약속 만들기 모달 ---- */

function openScheduleModal(defaultDateKey = null) {
    if (scheduleDateInput) {
        if (defaultDateKey) {
            scheduleDateInput.value = defaultDateKey;
        } else {
            // 오늘 날짜 기본값
            const todayKey = formatDateKey(new Date());
            scheduleDateInput.value = todayKey;
        }
    }

    if (scheduleTitleInput) scheduleTitleInput.value = "";
    if (scheduleTimeInput) scheduleTimeInput.value = "";
    if (schedulePlaceInput) schedulePlaceInput.value = "";
    if (scheduleMemoInput) scheduleMemoInput.value = "";
    if (scheduleRemindInput) scheduleRemindInput.checked = true;

    openModal(scheduleModalId);
}

/* "약속 만들기" 버튼 */
openScheduleModalBtn?.addEventListener("click", () => {
    openScheduleModal(selectedDateForSchedule);
});

/* 캘린더 날짜 클릭 → 해당 날짜로 약속 만들기 */
document.addEventListener("click", (e) => {
    const cell = e.target.closest(".calendar-cell");
    if (!cell || !calendarGridEl || !cell.dataset.date) return;
    // 비어있는 칸(calendar-cell-empty) 예외
    if (cell.classList.contains("calendar-cell-empty")) return;

    selectedDateForSchedule = cell.dataset.date;
    openScheduleModal(selectedDateForSchedule);
});

/* 약속 폼 submit */
scheduleForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = scheduleTitleInput.value.trim();
    const date = scheduleDateInput.value;
    const time = scheduleTimeInput.value;
    const place = schedulePlaceInput.value.trim();
    const memo = scheduleMemoInput.value.trim();
    const remind = scheduleRemindInput.checked;

    if (!title || !date) {
        alert("약속 제목과 날짜는 필수에요 🥺");
        return;
    }

    // 간단 타입 추론: 여행/외식
    const lowerTitle = title.toLowerCase();
    let type = "dinner";
    if (lowerTitle.includes("여행") || lowerTitle.includes("trip")) type = "trip";

    const events = loadEvents();
    const newEvent = {
        id: Date.now().toString(),
        title,
        date,
        time,
        place,
        memo,
        type,
        remind,
    };

    events.push(newEvent);
    saveEvents(events);

    renderCalendar(calendarState.year, calendarState.month);
    renderEventList();

    if (remind) {
        addNotification({
            type: "info",
            message: `가족 약속 "${title}"이(가) 캘린더에 등록되었어요.`,
        });
    } else {
        addNotification({
            type: "info",
            message: `가족 약속 "${title}"이(가) 저장되었어요.`,
        });
    }

    closeModal(scheduleModalId);
});

/* 일정 리스트에서 알림 버튼 클릭 시 */
document.addEventListener("click", (e) => {
    const remindBtn = e.target.closest(".event-remind-btn");
    if (!remindBtn) return;

    const eventItem = remindBtn.closest(".event-item");
    const eventId = eventItem?.dataset.eventId;
    if (!eventId) return;

    const events = loadEvents();
    const ev = events.find((x) => x.id === eventId);
    if (!ev) return;

    addNotification({
        type: "info",
        message: `약속 "${ev.title}" 알림이 활성화되어 있다고 가정할게요 (FCM 연동 자리).`,
    });
});

/* 캘린더 이전/다음 달 버튼 */
calendarPrevBtn?.addEventListener("click", () => {
    let { year, month } = calendarState;
    month -= 1;
    if (month < 0) {
        month = 11;
        year -= 1;
    }
    calendarState = { year, month };
    renderCalendar(year, month);
});

calendarNextBtn?.addEventListener("click", () => {
    let { year, month } = calendarState;
    month += 1;
    if (month > 11) {
        month = 0;
        year += 1;
    }
    calendarState = { year, month };
    renderCalendar(year, month);
});

/* -----------------------------------------------------
   🔐 로그인 / 회원가입 모달 탭 전환
----------------------------------------------------- */

const authTabs = document.querySelectorAll(".auth-tab");
const authPanels = document.querySelectorAll(".auth-panel");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");

authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.authTab;
        if (!target) return;

        authTabs.forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");

        authPanels.forEach((panel) => {
            if (panel.dataset.authPanel === target) {
                panel.classList.add("is-active");
            } else {
                panel.classList.remove("is-active");
            }
        });
    });
});

/* 로그인 / 회원가입 submit (데모용 처리) */
loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    addNotification({
        type: "info",
        message: "로그인 요청이 전송되었다고 가정할게요. (백엔드 연동 자리)",
    });
    closeModal("modal-auth");
});

signupForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    addNotification({
        type: "info",
        message: "회원가입 정보가 저장되었다고 가정할게요. (백엔드 연동 자리)",
    });
    closeModal("modal-auth");
});

/* -----------------------------------------------------
   🧭 헤더 네비 / 기타 버튼 UX
----------------------------------------------------- */

/* 네비 pill active 전환만 처리 (실제로 화면 전환은 추후 SPA에서 처리) */
document.querySelectorAll(".nav-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
        document
            .querySelectorAll(".nav-pill")
            .forEach((p) => p.classList.remove("is-active"));
        pill.classList.add("is-active");

        addNotification({
            type: "info",
            message: `"${pill.textContent.trim()}" 섹션으로 이동했다고 가정할게요.`,
        });
    });
});

/* 초대 코드 버튼 (더미) */
document.getElementById("open-invite")?.addEventListener("click", () => {
    const dummyCode = "DADAM-FA1234";
    addNotification({
        type: "info",
        message: `가족 초대 코드 "${dummyCode}"가 생성되었다고 가정할게요.`,
    });
    alert(`가족 초대 코드: ${dummyCode}\n복사해서 가족에게 보내 주세요 💌`);
});

/* 질문 아카이브 / 선택 버튼 (더미) */
document.getElementById("open-question-archive")?.addEventListener("click", () => {
    addNotification({
        type: "info",
        message: "질문 아카이브/선택 기능은 나중에 구현될 예정이에요. 지금은 디자인만 준비!",
    });
});

/* -----------------------------------------------------
   📅 오늘 날짜 라벨 세팅 (히어로 상단)
----------------------------------------------------- */

function setTodayLabel() {
    const labelEl = document.getElementById("today-label");
    if (!labelEl) return;

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    labelEl.textContent = `${y}년 ${m}월 ${d}일`;
}

/* -----------------------------------------------------
   🧷 초기화
----------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    // 오늘 날짜 설정
    setTodayLabel();

    // 캘린더 초기값: 현재 월
    renderCalendar(calendarState.year, calendarState.month);

    // 일정 리스트 렌더
    renderEventList();
});
