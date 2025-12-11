/* =====================================================
   dadam.ui.js
   - 캘린더 렌더링 (로컬 + 서버 일정 데이터 기반)
   - 날짜별 약속 목록 모달
   - 약속 상세 모달 + 약속 만들기 모달
   - 헤더 네비/부가 버튼 UX
===================================================== */

/* -----------------------------------------------------
   로컬스토리지 키 보완 (이벤트용)
----------------------------------------------------- */

if (!DADAM_KEYS.EVENTS) {
    DADAM_KEYS.EVENTS = "dadam_events";
}

/* 백엔드 캘린더 API 기본 경로 */
const SCHEDULE_API = `${API_BASE}/schedules`;

/* -----------------------------------------------------
   캘린더 / 일정 관련 DOM
----------------------------------------------------- */

const calendarTitleEl = document.getElementById("calendar-title");
const calendarGridEl = document.getElementById("calendar-grid");
const calendarPrevBtn = document.getElementById("calendar-prev");
const calendarNextBtn = document.getElementById("calendar-next");
const eventListEl = document.getElementById("event-list");

/* 약속 만들기 모달 */
const scheduleModalId = "modal-schedule";
const scheduleForm = document.getElementById("schedule-form");
const scheduleTitleInput = document.getElementById("schedule-title");
const scheduleDateInput = document.getElementById("schedule-date");
const scheduleTimeInput = document.getElementById("schedule-time");
const schedulePlaceInput = document.getElementById("schedule-place");
const scheduleMemoInput = document.getElementById("schedule-memo");
const scheduleRemindInput = document.getElementById("schedule-remind");
const scheduleTypeInput = document.getElementById("schedule-type");
const openScheduleModalBtn = document.getElementById("open-schedule-modal");

/* 날짜별 약속 목록 모달 */
const dayEventsModalId = "modal-day-events";
const dayEventsListEl = document.getElementById("day-events-list");
const dayEventsDateLabelEl = document.getElementById("day-events-date-label");
const dayEventsCreateBtn = document.getElementById("day-events-create-btn");

/* 약속 상세 모달 */
const scheduleDetailModalId = "modal-schedule-detail";
const scheduleDetailTitleEl = document.getElementById("schedule-detail-title");
const scheduleDetailDateEl = document.getElementById("schedule-detail-date");
const scheduleDetailTimeEl = document.getElementById("schedule-detail-time");
const scheduleDetailPlaceEl = document.getElementById("schedule-detail-place");
const scheduleDetailTypeEl = document.getElementById("schedule-detail-type");
const scheduleDetailMemoEl = document.getElementById("schedule-detail-memo");
const scheduleDetailEditBtn = document.getElementById("schedule-detail-edit-btn");
const scheduleDetailDeleteBtn = document.getElementById("schedule-detail-delete-btn");

let calendarState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0~11
};

let selectedDateForSchedule = null;
/** 수정 모드 여부 (null이면 새 일정 생성 모드) */
let editingEventId = null;

/** 상세 모달에서 현재 보고 있는 일정 id/객체 */
let currentDetailScheduleId = null;
let currentDetailSchedule = null;

/* -----------------------------------------------------
   일정 데이터 헬퍼 (로컬)
----------------------------------------------------- */

function loadEvents() {
    return load(DADAM_KEYS.EVENTS, []);
}

function saveEvents(events) {
    save(DADAM_KEYS.EVENTS, events);
}

/* "2025-11-20" 형식 yyyy-mm-dd */
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

/* 보기용: "2025-12-10" → "2025년 12월 10일" */
function formatKoreanDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    return `${y}년 ${m}월 ${d}일`;
}

/* -----------------------------------------------------
   서버 일정 관련 헬퍼
----------------------------------------------------- */

/**
 * 서버 응답 ScheduleResponse / ScheduleUpdateResponse 를
 * 프론트 이벤트 객체 형태로 변환
 */
function mapScheduleToEvent(schedule) {
    const title = schedule.title ?? schedule.appointmentName ?? "";
    const date = schedule.date ?? schedule.appointmentDate;
    const type = schedule.type ?? null;   // ✅ 더 이상 강제로 dinner/trip 안 넣기

    return {
        id: String(schedule.id),
        title,
        date,
        time: schedule.time ?? "",
        place: schedule.place ?? "",
        memo: schedule.memo ?? "",
        type,                              // 👉 진짜 DB 값 그대로 (null 허용)
        remind: schedule.remind ?? false,
    };
}

/** 인증 헤더 공통 처리 */
function buildAuthHeaders(base = {}) {
    const headers = { ...base };
    const token = getAuthToken?.();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * 서버에서 다가오는 일정 목록을 가져와
 * 로컬스토리지에 반영하고 캘린더/리스트를 다시 그린다.
 */
async function syncEventsFromServer() {
    try {
        const res = await fetch(`${SCHEDULE_API}/upcoming`, {
            method: "GET",
            headers: buildAuthHeaders({
                "Content-Type": "application/json",
            }),
        });

        if (!res.ok) {
            console.error("다가오는 일정 조회 실패:", res.status);
            return;
        }

        const data = await res.json(); // [ScheduleResponse...]
        const events = Array.isArray(data)
            ? data.map((s) => mapScheduleToEvent(s))
            : [];

        saveEvents(events);
        renderCalendar(calendarState.year, calendarState.month);
        renderEventList();
    } catch (err) {
        console.error("서버 일정 동기화 중 오류:", err);
    }
}

/**
 * 특정 날짜 기준 서버에서 일정 목록 조회
 * GET /api/v1/schedules?date=YYYY-MM-DD
 */
async function fetchSchedulesByDate(dateKey) {
    try {
        const url = `${SCHEDULE_API}?date=${encodeURIComponent(dateKey)}`;
        const res = await fetch(url, {
            method: "GET",
            headers: buildAuthHeaders({
                "Content-Type": "application/json",
            }),
        });

        if (!res.ok) {
            throw new Error(`특정 날짜 일정 조회 실패: ${res.status}`);
        }

        const data = await res.json(); // [ScheduleResponse...]
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error(err);
        alert("해당 날짜의 약속을 불러오는 중 문제가 발생했습니다.");
        return [];
    }
}

/**
 * 단일 일정 상세 조회
 * GET /api/v1/schedules/{id}
 */
async function fetchScheduleDetail(scheduleId) {
    try {
        const res = await fetch(`${SCHEDULE_API}/${scheduleId}`, {
            method: "GET",
            headers: buildAuthHeaders({
                "Content-Type": "application/json",
            }),
        });

        if (!res.ok) {
            throw new Error(`일정 상세 조회 실패: ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error(err);
        alert("약속 상세를 불러오는 중 문제가 발생했습니다.");
        return null;
    }
}

/* -----------------------------------------------------
   캘린더 렌더링
----------------------------------------------------- */

function renderCalendar(year, monthIndex) {
    if (!calendarGridEl || !calendarTitleEl) return;

    const firstDay = new Date(year, monthIndex, 1);
    const firstWeekday = firstDay.getDay(); // 0(일)~6(토)
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const events = loadEvents();

    calendarTitleEl.textContent = `${year}년 ${monthIndex + 1}월`;

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

        const todaysEvents = events.filter((ev) => ev.date === dateKey);

        const dotWrapper = document.createElement("div");
        if (todaysEvents.length > 0) {
            todaysEvents.slice(0, 2).forEach((ev) => {
                const dot = document.createElement("div");
                dot.className = "calendar-event-dot";
                if (ev.type === "trip") {
                    dot.classList.add("calendar-event-trip");
                } else {
                    dot.classList.add("calendar-event-dinner");
                }
                dotWrapper.appendChild(dot);
            });
        }

        cell.appendChild(dayNumberEl);
        cell.appendChild(dotWrapper);

        calendarGridEl.appendChild(cell);
    }
}

/* -----------------------------------------------------
   전체 일정 리스트 렌더링 (사이드 리스트)
----------------------------------------------------- */

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

            const remindOnClass = ev.remind ? " is-remind-on" : "";

            return `
        <article class="event-item" data-event-id="${ev.id}">
          <div class="event-dot ${typeClass}"></div>
          <div class="event-text">
            <p class="event-title">${ev.title}</p>
            <p class="event-meta">${dateLabel}${timeLabel}${placeLabel}</p>
          </div>
          <div class="event-actions">
            <button class="ghost-icon-btn event-remind-btn${remindOnClass}" type="button" aria-label="알림 토글">
              <span class="fh-icon-bell-small"></span>
            </button>
          </div>
        </article>
      `;
        })
        .join("");
}

/* -----------------------------------------------------
   약속 만들기 모달
----------------------------------------------------- */

/**
 * 약속 모달 열기
 * - defaultDateKey: 날짜만 지정 (새 일정 생성)
 * - eventToEdit: 수정 모드로 열고 싶을 때 기존 이벤트 객체
 */
function openScheduleModal(defaultDateKey = null, eventToEdit = null) {
    if (eventToEdit) {
        editingEventId = eventToEdit.id;

        if (scheduleDateInput) scheduleDateInput.value = eventToEdit.date;
        if (scheduleTitleInput) scheduleTitleInput.value = eventToEdit.title || "";
        if (scheduleTimeInput) scheduleTimeInput.value = eventToEdit.time || "";
        if (schedulePlaceInput) schedulePlaceInput.value = eventToEdit.place || "";
        if (scheduleMemoInput) scheduleMemoInput.value = eventToEdit.memo || "";
        if (scheduleRemindInput)
            scheduleRemindInput.checked = Boolean(eventToEdit.remind);
        if (scheduleTypeInput) {
            scheduleTypeInput.value = eventToEdit.type || "";   // 🔹 null이면 "선택 안 함"
        }
    } else {
        editingEventId = null;

        if (scheduleDateInput) {
            if (defaultDateKey) {
                scheduleDateInput.value = defaultDateKey;
            } else {
                const todayKey = formatDateKey(new Date());
                scheduleDateInput.value = todayKey;
            }
        }

        if (scheduleTitleInput) scheduleTitleInput.value = "";
        if (scheduleTimeInput) scheduleTimeInput.value = "";
        if (schedulePlaceInput) schedulePlaceInput.value = "";
        if (scheduleMemoInput) scheduleMemoInput.value = "";
        if (scheduleRemindInput) scheduleRemindInput.checked = true;
        if (scheduleTypeInput) scheduleTypeInput.value = "";
    }

    openModal(scheduleModalId);
}

/* "약속 만들기" 버튼 (헤더 등) */
openScheduleModalBtn?.addEventListener("click", () => {
    openScheduleModal(selectedDateForSchedule);
});

/* -----------------------------------------------------
   날짜 클릭 → 해당 날짜 약속 목록 모달
----------------------------------------------------- */

async function openDayEventsModal(dateKey) {
    if (!dayEventsListEl) return;

    selectedDateForSchedule = dateKey;

    if (dayEventsDateLabelEl) {
        dayEventsDateLabelEl.textContent = formatKoreanDate(dateKey);
    }

    const schedules = await fetchSchedulesByDate(dateKey);

    if (!schedules || schedules.length === 0) {
        dayEventsListEl.innerHTML = `
      <p class="day-events-empty">해당 날짜에는 등록된 약속이 없어요.</p>
    `;
    } else {
        dayEventsListEl.innerHTML = schedules
            .map((s) => {
                const ev = mapScheduleToEvent(s);
                const timeLabel = ev.time ? ` · ${ev.time}` : "";
                const placeLabel = ev.place ? ` · ${ev.place}` : "";
                return `
          <button type="button"
                  class="day-event-item"
                  data-schedule-id="${ev.id}">
            <span class="day-event-title">${ev.title}</span>
            <span class="day-event-meta">${formatKoreanDate(ev.date)}${timeLabel}${placeLabel}</span>
          </button>
        `;
            })
            .join("");
    }

    openModal(dayEventsModalId);
}

/* 캘린더 날짜 클릭 핸들러 */
document.addEventListener("click", (e) => {
    const cell = e.target.closest(".calendar-cell");
    if (!cell || !calendarGridEl || !cell.dataset.date) return;
    if (cell.classList.contains("calendar-cell-empty")) return;

    const dateKey = cell.dataset.date;
    openDayEventsModal(dateKey);
});

/* 날짜별 모달에서 "이 날짜에 새 약속 만들기" 버튼 */
dayEventsCreateBtn?.addEventListener("click", () => {
    if (!selectedDateForSchedule) return;
    closeModal(dayEventsModalId);
    openScheduleModal(selectedDateForSchedule);
});

/* 날짜별 모달 내부: 약속 클릭 → (리스트 모달 닫고) 상세 모달 */
document.addEventListener("click", (e) => {
    const item = e.target.closest(".day-event-item");
    if (!item || !item.dataset.scheduleId) return;

    const scheduleId = item.dataset.scheduleId;
    closeModal(dayEventsModalId);
    openScheduleDetailModal(scheduleId);
});

/* -----------------------------------------------------
   약속 상세 모달
----------------------------------------------------- */

async function openScheduleDetailModal(scheduleId) {
    const schedule = await fetchScheduleDetail(scheduleId);
    if (!schedule) return;

    const ev = mapScheduleToEvent(schedule);
    currentDetailScheduleId = ev.id;
    currentDetailSchedule = schedule;
    selectedDateForSchedule = ev.date;

    if (scheduleDetailTitleEl) scheduleDetailTitleEl.textContent = ev.title || "";
    if (scheduleDetailDateEl) scheduleDetailDateEl.textContent = formatKoreanDate(ev.date);
    if (scheduleDetailTimeEl) scheduleDetailTimeEl.textContent = ev.time || "-";
    if (scheduleDetailPlaceEl) scheduleDetailPlaceEl.textContent = ev.place || "-";
    if (scheduleDetailTypeEl) scheduleDetailTypeEl.textContent = ev.type || "기타";
    if (scheduleDetailMemoEl) scheduleDetailMemoEl.textContent = ev.memo || "-";

    openModal(scheduleDetailModalId);
}

/* 상세 모달: 수정 버튼 */
scheduleDetailEditBtn?.addEventListener("click", () => {
    if (!currentDetailSchedule) return;
    const ev = mapScheduleToEvent(currentDetailSchedule);

    closeModal(scheduleDetailModalId);
    openScheduleModal(ev.date, ev);
});

/* 상세 모달: 삭제 버튼 */
scheduleDetailDeleteBtn?.addEventListener("click", async () => {
    if (!currentDetailScheduleId) return;

    const ok = confirm("이 약속을 삭제할까요?");
    if (!ok) return;

    const targetId = currentDetailScheduleId;
    const targetDate = selectedDateForSchedule;

    try {
        const res = await fetch(`${SCHEDULE_API}/${targetId}`, {
            method: "DELETE",
            headers: buildAuthHeaders(),
        });

        if (!res.ok) {
            throw new Error(`일정 삭제 실패: ${res.status}`);
        }

        const events = loadEvents();
        const nextEvents = events.filter(
            (ev) => String(ev.id) !== String(targetId)
        );
        saveEvents(nextEvents);

        renderCalendar(calendarState.year, calendarState.month);
        renderEventList();

        closeModal(scheduleDetailModalId);

        // 날짜 모달이 열려 있었던 경우를 대비해, 해당 날짜 리스트 다시 갱신
        if (targetDate) {
            openDayEventsModal(targetDate);
        }

        addNotification?.({
            type: "info",
            message: "약속이 삭제되었습니다.",
        });
    } catch (err) {
        console.error(err);
        alert("일정 삭제 중 문제가 발생했습니다.");
    }
});

/* -----------------------------------------------------
   약속 폼 submit → 생성 / 수정 (POST / PUT)
----------------------------------------------------- */

scheduleForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = scheduleTitleInput.value.trim();
    const date = scheduleDateInput.value;
    const time = scheduleTimeInput.value;
    const place = schedulePlaceInput.value.trim();
    const memo = scheduleMemoInput.value.trim();
    const remind = scheduleRemindInput.checked;
    const rawType = scheduleTypeInput ? scheduleTypeInput.value : "";

    if (!title || !date) {
        alert("약속 제목과 날짜는 필수입니다.");
        return;
    }

    // ✅ 타입 선택 강제
    if (!rawType) {
        alert("약속 종류를 선택해 주세요.");
        scheduleTypeInput?.focus();
        return;
    }

    const type = rawType;   // 이제 null 안 보냄, 항상 "dinner"/"trip"/"event"

    const payload = {
        title,
        date,
        time: time || null,
        place: place || null,
        memo: memo || null,
        type,          // "dinner" / "trip" / "event"
        remind,
    };

    const isEdit = Boolean(editingEventId);

    try {
        const url = isEdit
            ? `${SCHEDULE_API}/${editingEventId}`
            : SCHEDULE_API;

        const res = await fetch(url, {
            method: isEdit ? "PUT" : "POST",
            headers: buildAuthHeaders({
                "Content-Type": "application/json",
            }),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            throw new Error(
                isEdit
                    ? `일정 수정 실패: ${res.status}`
                    : `일정 등록 실패: ${res.status}`
            );
        }

        const saved = await res.json();
        const savedEvent = mapScheduleToEvent(saved);

        const events = loadEvents();
        if (isEdit) {
            const idx = events.findIndex(
                (ev) => String(ev.id) === String(editingEventId)
            );
            if (idx !== -1) {
                events[idx] = savedEvent;
            } else {
                events.push(savedEvent);
            }
        } else {
            events.push(savedEvent);
        }

        saveEvents(events);

        renderCalendar(calendarState.year, calendarState.month);
        renderEventList();
        closeModal(scheduleModalId);

        editingEventId = null;

        addNotification?.({
            type: "info",
            message: isEdit ? "약속이 수정되었습니다." : "약속이 등록되었습니다.",
        });

        // 상세 모달에서 수정한 경우를 대비해 상태 갱신
        currentDetailScheduleId = savedEvent.id;
        currentDetailSchedule = saved;

    } catch (err) {
        console.error(err);
        alert(isEdit ? "일정 수정 중 오류가 발생했습니다." : "일정 등록 중 오류가 발생했습니다.");
    }
});

/* -----------------------------------------------------
   전체 일정 리스트 액션
   - 알림 토글
   - 나머지 영역 클릭 → 약속 상세 모달
----------------------------------------------------- */

eventListEl?.addEventListener("click", (e) => {
    const eventItem = e.target.closest(".event-item");
    if (!eventItem) return;

    const eventId = eventItem.dataset.eventId;
    if (!eventId) return;

    const events = loadEvents();
    const idx = events.findIndex((ev) => String(ev.id) === String(eventId));
    if (idx === -1) return;

    const targetEvent = events[idx];

    /* 🔔 알림 토글 버튼 (로컬 전용) */
    const remindBtn = e.target.closest(".event-remind-btn");
    if (remindBtn) {
        const newRemind = !Boolean(targetEvent.remind);

        events[idx] = { ...targetEvent, remind: newRemind };
        saveEvents(events);

        if (newRemind) {
            remindBtn.classList.add("is-remind-on");
        } else {
            remindBtn.classList.remove("is-remind-on");
        }

        addNotification?.({
            type: "info",
            message: newRemind
                ? `약속 "${targetEvent.title}" 알림을 켰습니다.`
                : `약속 "${targetEvent.title}" 알림을 껐습니다.`,
        });
        return;
    }

    /* ✅ 알림 버튼 이외 영역 클릭 → 약속 상세 모달 */
    selectedDateForSchedule = targetEvent.date;
    openScheduleDetailModal(eventId);
});


/* -----------------------------------------------------
   캘린더 이전/다음 달 버튼
----------------------------------------------------- */

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
   헤더 네비 / 기타 버튼 UX
----------------------------------------------------- */

document.querySelectorAll(".nav-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
        document
            .querySelectorAll(".nav-pill")
            .forEach((p) => p.classList.remove("is-active"));
        pill.classList.add("is-active");
    });
});

document.getElementById("open-invite")?.addEventListener("click", () => {
    if (typeof openFamilyInviteModal === "function") {
        openFamilyInviteModal();
    } else {
        alert("초대 코드를 불러올 수 없습니다. 로그인 상태를 확인해 주세요.");
    }
});

document
    .getElementById("open-question-archive")
    ?.addEventListener("click", () => {
        alert("질문 아카이브/선택 기능은 추후 구현될 예정입니다.");
    });

/* -----------------------------------------------------
   오늘 날짜 라벨 세팅 (히어로 상단)
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
   초기화
----------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    setTodayLabel();

    renderCalendar(calendarState.year, calendarState.month);
    renderEventList();

    syncEventsFromServer();
});
