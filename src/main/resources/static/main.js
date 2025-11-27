// 유저 이름 표시
const userName1 = "나희" // 백엔드에서 내려준 값
const userName2 = "수진"
const userName3 = "민규"
document.getElementById("familyName").textContent = `화목한 ${userName1}네`
document.getElementById("user1").textContent = userName1
document.getElementById("user2").textContent = userName2
document.getElementById("user3").textContent = userName3

// 프로필 이미지 localStorage 키
const PROFILE_STORAGE_KEY = "dadam_profiles_v1"

// 프로필 이미지 저장
function saveProfileImage(userId, imageData) {
  try {
    const profiles = loadProfileImages()
    profiles[userId] = imageData
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles))
  } catch (e) {
    console.error("프로필 저장 실패:", e)
  }
}

// 프로필 이미지 불러오기
function loadProfileImages() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

// 프로필 이미지 표시
function displayProfileImage(userId, imageData) {
  const avatarEl = document.getElementById(`avatar${userId.slice(-1)}`)
  const imgEl = document.getElementById(`profileImg${userId.slice(-1)}`)
  const placeholderEl = avatarEl?.querySelector(".avatar-placeholder")

  if (!avatarEl || !imgEl) return

  if (imageData) {
    imgEl.src = imageData
    imgEl.style.display = "block"
    if (placeholderEl) placeholderEl.style.display = "none"
  } else {
    imgEl.style.display = "none"
    if (placeholderEl) placeholderEl.style.display = "block"
  }
}

// 파일을 base64로 변환
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 프로필 이미지 업로드 처리
function setupProfileUpload() {
  const profileInputs = document.querySelectorAll(".profile-input")

  profileInputs.forEach((input) => {
    input.addEventListener("change", async (e) => {
      const file = e.target.files[0]
      if (!file) return

      // 이미지 파일인지 확인
      if (!file.type.startsWith("image/")) {
        alert("이미지 파일만 업로드 가능합니다.")
        return
      }

      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("파일 크기는 5MB 이하여야 합니다.")
        return
      }

      try {
        const userId = input.dataset.user
        const imageData = await fileToBase64(file)

        // 이미지 표시
        displayProfileImage(userId, imageData)

        // localStorage에 저장
        saveProfileImage(userId, imageData)
      } catch (error) {
        console.error("이미지 업로드 실패:", error)
        alert("이미지 업로드에 실패했습니다.")
      }
    })
  })
}

// 저장된 프로필 이미지 불러오기
function loadSavedProfiles() {
  const profiles = loadProfileImages()

  Object.keys(profiles).forEach((userId) => {
    const imageData = profiles[userId]
    if (imageData) {
      displayProfileImage(userId, imageData)
    }
  })
}

// 프로필 이미지 초기화
setupProfileUpload()
loadSavedProfiles()

// 게임 선택 저장 키
const QUIZ_STORAGE_KEY = "dadam_quiz_selections_v1"
const BALANCE_STORAGE_KEY = "dadam_balance_selections_v1"

// 사용자 정보 매핑
const userMap = {
  user1: { name: userName1, emoji: "😍" },
  user2: { name: userName2, emoji: "🙂" },
  user3: { name: userName3, emoji: "😴" },
}

// 현재 사용자 (예시로 user1 사용, 나중에 로그인 정보로 변경)
const currentUserId = "user1"

// 선택 저장 (하나만 선택 가능)
function saveSelection(storageKey, option, userId) {
  try {
    const selections = loadSelections(storageKey)

    // 현재 사용자가 이미 선택한 선택지에서 제거
    Object.keys(selections).forEach((key) => {
      if (selections[key] && Array.isArray(selections[key])) {
        selections[key] = selections[key].filter((id) => id !== userId)
        if (selections[key].length === 0) {
          delete selections[key]
        }
      }
    })

    // 새 선택지에 추가
    if (!selections[option]) {
      selections[option] = []
    }
    if (!selections[option].includes(userId)) {
      selections[option].push(userId)
    }

    localStorage.setItem(storageKey, JSON.stringify(selections))
    return selections
  } catch (e) {
    console.error("선택 저장 실패:", e)
    return {}
  }
}

// 선택 불러오기
function loadSelections(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

// 프로필 이미지 가져오기
function getProfileImage(userId) {
  const profiles = loadProfileImages()
  return profiles[userId] || null
}

// 선택지에 프로필 사진 표시
function renderOptionProfiles(optionEl, userIds) {
  const profilesContainer = optionEl.querySelector(".option-profiles")
  if (!profilesContainer) return

  profilesContainer.innerHTML = ""

  userIds.forEach((userId) => {
    const userInfo = userMap[userId]
    if (!userInfo) return

    const profileImg = getProfileImage(userId)
    const profileEl = document.createElement("div")
    profileEl.className = "option-profile-img-wrapper"

    if (profileImg) {
      const img = document.createElement("img")
      img.className = "option-profile-img"
      img.src = profileImg
      img.alt = userInfo.name
      profileEl.appendChild(img)
    } else {
      const placeholder = document.createElement("div")
      placeholder.className = "option-profile-placeholder"
      placeholder.textContent = userInfo.emoji
      profileEl.appendChild(placeholder)
    }

    profilesContainer.appendChild(profileEl)
  })
}

// 신조어 퀴즈 선택 처리
function setupQuizSelection() {
  const quizOptions = document.querySelectorAll(".quiz-option")

  function renderAllOptions() {
    const selections = loadSelections(QUIZ_STORAGE_KEY)
    quizOptions.forEach((option) => {
      const optionText = option.dataset.option
      const userIds = selections[optionText] || []
      renderOptionProfiles(option, userIds)
    })
  }

  // 초기 렌더링
  renderAllOptions()

  // 클릭 이벤트
  quizOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const optionText = option.dataset.option
      saveSelection(QUIZ_STORAGE_KEY, optionText, currentUserId)
      // 모든 선택지 다시 렌더링
      renderAllOptions()
      // 알림 생성
      const userInfo = userMap[currentUserId]
      saveNotification(
        NOTIFICATION_TYPES.QUIZ,
        `${userInfo.name}님이 신조어 퀴즈에서 "${optionText}"을(를) 선택했습니다.`,
        { option: optionText, user: userInfo.name }
      )
    })
  })
}

// 밸런스 게임 선택 처리
function setupBalanceSelection() {
  const balanceOptions = document.querySelectorAll(".balance-option")

  function renderAllOptions() {
    const selections = loadSelections(BALANCE_STORAGE_KEY)
    balanceOptions.forEach((option) => {
      const optionText = option.dataset.option
      const userIds = selections[optionText] || []
      renderOptionProfiles(option, userIds)
    })
  }

  // 초기 렌더링
  renderAllOptions()

  // 클릭 이벤트
  balanceOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const optionText = option.dataset.option
      saveSelection(BALANCE_STORAGE_KEY, optionText, currentUserId)
      // 모든 선택지 다시 렌더링
      renderAllOptions()
      // 알림 생성
      const userInfo = userMap[currentUserId]
      saveNotification(
        NOTIFICATION_TYPES.BALANCE,
        `${userInfo.name}님이 밸런스 게임에서 "${optionText}"을(를) 선택했습니다.`,
        { option: optionText, user: userInfo.name }
      )
    })
  })
}

// 게임 선택 초기화
setupQuizSelection()
setupBalanceSelection()

// 알림 시스템
const NOTIFICATION_STORAGE_KEY = "dadam_notifications_v1"
const notificationBtn = document.getElementById("notificationBtn")
const notificationBadge = document.getElementById("notificationBadge")
const notificationModal = document.getElementById("notificationModal")
const notificationModalCloseBtn = document.getElementById("notificationModalCloseBtn")
const notificationList = document.getElementById("notificationList")
const notificationEmpty = document.getElementById("notificationEmpty")

// 알림 타입
const NOTIFICATION_TYPES = {
  CALENDAR: "calendar",
  ANSWER: "answer",
  QUIZ: "quiz",
  BALANCE: "balance",
}

// 알림 아이콘 매핑
const notificationIcons = {
  [NOTIFICATION_TYPES.CALENDAR]: "📅",
  [NOTIFICATION_TYPES.ANSWER]: "💬",
  [NOTIFICATION_TYPES.QUIZ]: "📝",
  [NOTIFICATION_TYPES.BALANCE]: "⚖️",
}

// 알림 저장
function saveNotification(type, message, data = {}) {
  try {
    const notifications = loadNotifications()
    const notification = {
      id: Date.now(),
      type,
      message,
      data,
      read: false,
      timestamp: new Date().toISOString(),
    }
    notifications.unshift(notification)
    // 최대 50개까지만 저장
    if (notifications.length > 50) {
      notifications.splice(50)
    }
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications))
    updateNotificationBadge()
    return notification
  } catch (e) {
    console.error("알림 저장 실패:", e)
    return null
  }
}

// 알림 불러오기
function loadNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

// 시간 포맷팅
function formatTime(timestamp) {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = now - time

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "방금 전"
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  return time.toLocaleDateString("ko-KR")
}

// 알림 뱃지 업데이트
function updateNotificationBadge() {
  const notifications = loadNotifications()
  const unreadCount = notifications.filter((n) => !n.read).length
  if (unreadCount > 0) {
    notificationBadge.textContent = unreadCount > 99 ? "99+" : unreadCount
    notificationBadge.style.display = "flex"
  } else {
    notificationBadge.style.display = "none"
  }
}

// 알림 리스트 렌더링
function renderNotifications() {
  const notifications = loadNotifications()
  notificationList.innerHTML = ""

  if (notifications.length === 0) {
    notificationEmpty.style.display = "block"
    return
  }

  notificationEmpty.style.display = "none"

  notifications.forEach((notification) => {
    const item = document.createElement("div")
    item.className = `notification-item ${notification.read ? "read" : ""}`
    item.dataset.id = notification.id
    item.innerHTML = `
      <div class="notification-icon">${notificationIcons[notification.type] || "🔔"}</div>
      <div class="notification-content">
        <div class="notification-text">${notification.message}</div>
        <div class="notification-time">${formatTime(notification.timestamp)}</div>
      </div>
    `

    // 클릭 시 읽음 처리
    item.addEventListener("click", () => {
      markAsRead(notification.id)
      item.classList.add("read")
    })

    notificationList.appendChild(item)
  })
}

// 알림 읽음 처리
function markAsRead(id) {
  const notifications = loadNotifications()
  const notification = notifications.find((n) => n.id === id)
  if (notification && !notification.read) {
    notification.read = true
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications))
    updateNotificationBadge()
  }
}

// 알림 모달 열기/닫기
function openNotificationModal() {
  notificationModal.classList.add("is-open")
  notificationModal.setAttribute("aria-hidden", "false")
  renderNotifications()
}

function closeNotificationModal() {
  notificationModal.classList.remove("is-open")
  notificationModal.setAttribute("aria-hidden", "true")
}

notificationBtn.addEventListener("click", openNotificationModal)
notificationModalCloseBtn.addEventListener("click", closeNotificationModal)

notificationModal.addEventListener("click", (e) => {
  if (e.target === notificationModal) {
    closeNotificationModal()
  }
})

// 초기 뱃지 업데이트
updateNotificationBadge()

// 캘린더 일정 하루 전 알림 체크
function checkCalendarNotifications() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // 예시 이벤트 데이터 (실제로는 캘린더에서 가져와야 함)
  const events = [
    { name: "수진이 생일", date: "2025-11-03" },
    { name: "나희 생일", date: "2025-11-06" },
    { name: "이마트 나들이", date: "2025-11-22" },
  ]

  const tomorrowStr = tomorrow.toISOString().split("T")[0]

  events.forEach((event) => {
    if (event.date === tomorrowStr) {
      // 이미 알림이 있는지 확인
      const notifications = loadNotifications()
      const existing = notifications.find(
        (n) => n.type === NOTIFICATION_TYPES.CALENDAR && n.data.eventName === event.name && n.data.eventDate === event.date
      )

      if (!existing) {
        saveNotification(
          NOTIFICATION_TYPES.CALENDAR,
          `내일 "${event.name}" 일정이 있습니다.`,
          { eventName: event.name, eventDate: event.date }
        )
      }
    }
  })
}

// 페이지 로드 시 알림 체크
checkCalendarNotifications()

// ESC 키로 알림 모달도 닫기
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (modalOverlay.classList.contains("is-open")) {
      closeAnswerModal()
    }
    if (eventModal.classList.contains("is-open")) {
      closeEventModal()
    }
    if (authModal.classList.contains("is-open")) {
      closeAuthModal()
    }
    if (notificationModal.classList.contains("is-open")) {
      closeNotificationModal()
    }
  }
})

// 글자수 표시
const answerEl = document.getElementById("answer")
const charCountEl = document.getElementById("charCount")
const commentList = document.getElementById("commentList")
const saveBtn = document.getElementById("saveBtn")

// 답변/대댓글 localStorage 저장용 키
const STORAGE_KEY = "dadam_answers_v1"

let answers = []

function loadAnswers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveAnswers() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
  } catch {
    // 저장 실패 시는 그냥 무시 (용량 초과 등)
  }
}

function createCommentCard(answer) {
  const item = document.createElement("div")
  item.className = "comment-card"
  item.dataset.id = String(answer.id)
  item.innerHTML = `
    <div class="comment-content">
      <div class="comment-header">
        <strong class="comment-author">${answer.author}</strong>
        <span class="comment-time">${answer.timeLabel}</span>
      </div>
      <p class="comment-text">${answer.content}</p>
    </div>
    <button class="comment-action" type="button">💬</button>
    <div class="reply-list"></div>
  `

  const replyList = item.querySelector(".reply-list")
  if (replyList && Array.isArray(answer.replies)) {
    answer.replies.forEach((reply) => {
      const replyItem = document.createElement("div")
      replyItem.className = "reply-item"
      replyItem.innerHTML = `
        <span class="reply-author">${reply.author}</span>
        <span class="reply-text">${reply.content}</span>
      `
      replyList.appendChild(replyItem)
    })
  }

  return item
}

function renderAnswers() {
  commentList.innerHTML = ""
  answers.forEach((answer) => {
    const card = createCommentCard(answer)
    commentList.appendChild(card)
  })
}

function initAnswers() {
  answers = loadAnswers()

  // 첫 방문 시엔 예시 데이터 한 번만 넣기
  if (answers.length === 0) {
    answers = [
      {
        id: Date.now(),
        author: "수진",
        content: "나희가 먹고싶은거는 다 좋아",
        timeLabel: "2분 전",
        replies: [],
      },
      {
        id: Date.now() - 1,
        author: "민규",
        content: "나는 햄부기",
        timeLabel: "10분 전",
        replies: [],
      },
    ]
    saveAnswers()
  }

  renderAnswers()
}

answerEl.addEventListener("input", () => {
  charCountEl.textContent = answerEl.value.length + " / 100"
})

saveBtn.addEventListener("click", () => {
  const text = answerEl.value.trim()
  if (!text) return

  const newAnswer = {
    id: Date.now(),
    author: userName1,
    content: text,
    timeLabel: "방금 전",
    replies: [],
  }

  answers.unshift(newAnswer)
  saveAnswers()
  renderAnswers()

  // 알림 생성 (다른 사용자에게 알림)
  saveNotification(
    NOTIFICATION_TYPES.ANSWER,
    `${userName1}님이 질문에 답변했습니다.`,
    { author: userName1, answerId: newAnswer.id }
  )

  answerEl.value = ""
  charCountEl.textContent = "0 / 100"
})

// 답변 상세 보기 모달
const modalOverlay = document.getElementById("answerModal")
const modalTitle = document.getElementById("modalTitle")
const modalAnswerText = document.getElementById("modalAnswerText")
const modalCloseBtn = document.getElementById("modalCloseBtn")
const modalReplies = document.getElementById("modalReplies")
const modalReplyInput = document.getElementById("modalReplyInput")
const modalReplyBtn = document.getElementById("modalReplyBtn")

let currentCommentCard = null
let currentAnswerId = null

function syncRepliesToModal() {
  if (!currentCommentCard) return
  modalReplies.innerHTML = ""

  const replyList = currentCommentCard.querySelectorAll(".reply-item")
  replyList.forEach((reply) => {
    const author = reply.querySelector(".reply-author")?.textContent || ""
    const text = reply.querySelector(".reply-text")?.textContent || ""
    const el = document.createElement("div")
    el.className = "modal-reply-item"
    el.innerHTML = `
      <span class="modal-reply-author">${author}</span>
      <span class="modal-reply-text">${text}</span>
    `
    modalReplies.appendChild(el)
  })
}

function openAnswerModal(author, text, card) {
  currentCommentCard = card
  currentAnswerId = card.dataset.id || null
  modalTitle.textContent = `${author}의 답변`
  modalAnswerText.textContent = text
  syncRepliesToModal()
  modalOverlay.classList.add("is-open")
  modalOverlay.setAttribute("aria-hidden", "false")
  modalReplyInput.value = ""
}

function closeAnswerModal() {
  modalOverlay.classList.remove("is-open")
  modalOverlay.setAttribute("aria-hidden", "true")
}

modalCloseBtn.addEventListener("click", closeAnswerModal)

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) {
    closeAnswerModal()
  }
})

// ESC 키로 답변 모달 닫기 (아래에서 통합 처리)

// 댓글 클릭 시 모달 열기 (이벤트 위임)
commentList.addEventListener("click", (e) => {
  const card = e.target.closest(".comment-card")
  if (!card) return

  const authorEl = card.querySelector(".comment-author")
  const textEl = card.querySelector(".comment-text")
  if (!authorEl || !textEl) return

  openAnswerModal(authorEl.textContent, textEl.textContent, card)
})

// 모달에서 대댓글 작성
modalReplyBtn.addEventListener("click", () => {
  const text = modalReplyInput.value.trim()
  if (!text || !currentCommentCard || !currentAnswerId) return

  const replyAuthor = userName1 // 대댓글 작성자를 userName1으로 설정

  // 카드 안에 대댓글 추가
  const replyList = currentCommentCard.querySelector(".reply-list")
  if (replyList) {
    const replyItem = document.createElement("div")
    replyItem.className = "reply-item"
    replyItem.innerHTML = `
      <span class="reply-author">${replyAuthor}</span>
      <span class="reply-text">${text}</span>
    `
    replyList.appendChild(replyItem)
  }

  // 모달 안 리스트에도 바로 반영
  const modalItem = document.createElement("div")
  modalItem.className = "modal-reply-item"
  modalItem.innerHTML = `
    <span class="modal-reply-author">${replyAuthor}</span>
    <span class="modal-reply-text">${text}</span>
  `
  modalReplies.appendChild(modalItem)

  // 데이터도 localStorage에 반영
  const targetId = Number(currentAnswerId)
  const target = answers.find((a) => a.id === targetId)
  if (target) {
    if (!Array.isArray(target.replies)) target.replies = []
    target.replies.push({
      author: replyAuthor,
      content: text,
    })
    saveAnswers()
  }

  modalReplyInput.value = ""
})


// 2025년 11월 달력
const calendarEl = document.getElementById("calendar")
const year = 2025
const month = 10
const firstDay = new Date(year, month, 1).getDay()
const lastDate = new Date(year, month + 1, 0).getDate()

let cells = ""
for (let i = 0; i < firstDay; i++) cells += `<div></div>`

for (let d = 1; d <= lastDate; d++) {
  let cls = "day-cell"
  if ([3, 7, 14, 21, 28].includes(d)) cls += " light"
  if ([5, 12, 19, 26].includes(d)) cls += " active"
  cells += `<div class="${cls}">${d}</div>`
}

calendarEl.insertAdjacentHTML("beforeend", cells)

// 페이지 로드 시 답변 초기화
initAnswers()

// 약속 만들기 모달
const eventModal = document.getElementById("eventModal")
const eventModalCloseBtn = document.getElementById("eventModalCloseBtn")
const createEventBtn = document.getElementById("createEventBtn")
const eventForm = document.getElementById("eventForm")
const eventCancelBtn = document.getElementById("eventCancelBtn")
const eventIconInput = document.getElementById("eventIcon")
const iconOptions = document.querySelectorAll(".icon-option")

function openEventModal() {
  eventModal.classList.add("is-open")
  eventModal.setAttribute("aria-hidden", "false")
  // 오늘 날짜를 기본값으로 설정
  const today = new Date().toISOString().split("T")[0]
  document.getElementById("eventDate").value = today
  // 첫 번째 아이콘 선택
  iconOptions[0].classList.add("selected")
  eventIconInput.value = iconOptions[0].dataset.icon
}

function closeEventModal() {
  eventModal.classList.remove("is-open")
  eventModal.setAttribute("aria-hidden", "true")
  eventForm.reset()
  iconOptions.forEach((opt) => opt.classList.remove("selected"))
}

createEventBtn.addEventListener("click", openEventModal)
eventModalCloseBtn.addEventListener("click", closeEventModal)
eventCancelBtn.addEventListener("click", closeEventModal)

eventModal.addEventListener("click", (e) => {
  if (e.target === eventModal) {
    closeEventModal()
  }
})

// 아이콘 선택
iconOptions.forEach((option) => {
  option.addEventListener("click", () => {
    iconOptions.forEach((opt) => opt.classList.remove("selected"))
    option.classList.add("selected")
    eventIconInput.value = option.dataset.icon
  })
})

// 약속 만들기 폼 제출
eventForm.addEventListener("submit", (e) => {
  e.preventDefault()
  const title = document.getElementById("eventTitle").value.trim()
  const date = document.getElementById("eventDate").value
  const icon = eventIconInput.value

  if (!title || !date) return

  // 여기서는 콘솔에만 출력 (나중에 백엔드 연결 시 API 호출)
  console.log("새 약속:", { title, date, icon })
  alert(`약속 "${title}"이(가) 생성되었습니다!`)

  closeEventModal()
})

// 로그인/회원가입 모달
const authModal = document.getElementById("authModal")
const authModalCloseBtn = document.getElementById("authModalCloseBtn")
const userBtn = document.getElementById("userBtn")
const authModalTitle = document.getElementById("authModalTitle")
const loginForm = document.getElementById("loginForm")
const signupForm = document.getElementById("signupForm")
const switchToSignupBtn = document.getElementById("switchToSignup")
const switchToLoginBtn = document.getElementById("switchToLogin")

function openAuthModal(isSignup = false) {
  authModal.classList.add("is-open")
  authModal.setAttribute("aria-hidden", "false")

  if (isSignup) {
    showSignupForm()
  } else {
    showLoginForm()
  }
}

function closeAuthModal() {
  authModal.classList.remove("is-open")
  authModal.setAttribute("aria-hidden", "true")
  loginForm.reset()
  signupForm.reset()
}

function showLoginForm() {
  authModalTitle.textContent = "로그인"
  loginForm.style.display = "flex"
  signupForm.style.display = "none"
}

function showSignupForm() {
  authModalTitle.textContent = "회원가입"
  loginForm.style.display = "none"
  signupForm.style.display = "flex"
}

userBtn.addEventListener("click", () => openAuthModal(false))
authModalCloseBtn.addEventListener("click", closeAuthModal)

authModal.addEventListener("click", (e) => {
  if (e.target === authModal) {
    closeAuthModal()
  }
})

switchToSignupBtn.addEventListener("click", () => showSignupForm())
switchToLoginBtn.addEventListener("click", () => showLoginForm())

// 로그인 폼 제출
loginForm.addEventListener("submit", (e) => {
  e.preventDefault()
  const email = document.getElementById("loginEmail").value.trim()
  const password = document.getElementById("loginPassword").value

  if (!email || !password) return

  // 여기서는 콘솔에만 출력 (나중에 백엔드 연결 시 API 호출)
  console.log("로그인 시도:", { email })
  alert("로그인되었습니다!")

  closeAuthModal()
})

// 회원가입 폼 제출
signupForm.addEventListener("submit", (e) => {
  e.preventDefault()
  const name = document.getElementById("signupName").value.trim()
  const email = document.getElementById("signupEmail").value.trim()
  const password = document.getElementById("signupPassword").value
  const passwordConfirm = document.getElementById("signupPasswordConfirm").value

  if (!name || !email || !password || !passwordConfirm) return

  if (password !== passwordConfirm) {
    alert("비밀번호가 일치하지 않습니다.")
    return
  }

  if (password.length < 6) {
    alert("비밀번호는 최소 6자 이상이어야 합니다.")
    return
  }

  // 여기서는 콘솔에만 출력 (나중에 백엔드 연결 시 API 호출)
  console.log("회원가입 시도:", { name, email })
  alert("회원가입이 완료되었습니다!")

  // 회원가입 후 로그인 폼으로 전환
  showLoginForm()
})

// ESC 키로 모든 모달 닫기 (통합 처리)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (modalOverlay.classList.contains("is-open")) {
      closeAnswerModal()
    }
    if (eventModal.classList.contains("is-open")) {
      closeEventModal()
    }
    if (authModal.classList.contains("is-open")) {
      closeAuthModal()
    }
  }
})
