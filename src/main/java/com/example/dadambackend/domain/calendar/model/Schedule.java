package com.example.dadambackend.domain.calendar.model;

import com.example.dadambackend.domain.calendar.dto.request.ScheduleRequest;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ✅ 필수
    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private LocalDate date;

    // ✅ 선택
    private String time;

    private String place;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(nullable = true)
    private String type;   // "trip" / "dinner" / null

    @Column(nullable = false)
    private boolean remind;    // null 불가지만, create에서 기본값 false로 처리

    @Column(name = "family_code")
    private String familyCode;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /* ---------- 팩토리 메서드 (생성용) ---------- */
    public static Schedule create(ScheduleRequest request, String familyCode) {
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("약속 이름(title)은 필수입니다.");
        }
        if (request.getDate() == null) {
            throw new IllegalArgumentException("약속 날짜(date)는 필수입니다.");
        }

        Schedule schedule = new Schedule();
        schedule.title = request.getTitle().trim();
        schedule.date = request.getDate();
        schedule.time = emptyToNull(request.getTime());
        schedule.place = emptyToNull(request.getPlace());
        schedule.memo = emptyToNull(request.getMemo());
        schedule.type = emptyToNull(request.getType());
        schedule.remind = request.getRemind() != null && request.getRemind();
        schedule.familyCode = (familyCode == null || familyCode.isBlank()) ? "" : familyCode.trim();
        schedule.createdAt = LocalDateTime.now();
        return schedule;
    }

    /* ---------- 수정 메서드 ---------- */
    public void update(ScheduleRequest request) {

        // 이름: null 이 아니고, 공백이 아니면 변경
        if (request.getTitle() != null && !request.getTitle().trim().isEmpty()) {
            this.title = request.getTitle().trim();
        }

        // 날짜: null 아니면 변경
        if (request.getDate() != null) {
            this.date = request.getDate();
        }

        // 나머지 필드들은 "보낸 값 기준"으로 변경 (빈 문자열은 null 로 처리)
        if (request.getTime() != null) {
            this.time = emptyToNull(request.getTime());
        }
        if (request.getPlace() != null) {
            this.place = emptyToNull(request.getPlace());
        }
        if (request.getMemo() != null) {
            this.memo = emptyToNull(request.getMemo());
        }
        if (request.getType() != null) {
            this.type = emptyToNull(request.getType());
        }
        if (request.getRemind() != null) {
            this.remind = request.getRemind();
        }
    }

    private static String emptyToNull(String s) {
        return (s == null || s.trim().isEmpty()) ? null : s.trim();
    }
}
