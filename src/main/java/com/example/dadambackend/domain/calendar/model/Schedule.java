package com.example.dadambackend.domain.calendar.model;

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

    public static final int MAX_ICON_TYPE = 6;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String appointmentName;

    @Column(nullable = false)
    private LocalDate appointmentDate;

    @Column(nullable = false)
    private int iconType;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Schedule(String appointmentName, LocalDate appointmentDate, int iconType) {
        if (iconType < 1 || iconType > MAX_ICON_TYPE) {
            throw new IllegalArgumentException("아이콘 타입은 1부터 " + MAX_ICON_TYPE + " 사이여야 합니다.");
        }

        this.appointmentName = appointmentName;
        this.appointmentDate = appointmentDate;
        this.iconType = iconType;
        this.createdAt = LocalDateTime.now();
    }

    public void update(String appointmentName, LocalDate appointmentDate, Integer iconType) { // ⭐ Integer로 받도록 수정
        // 이름 수정: null이 아니면 업데이트
        if (appointmentName != null && !appointmentName.trim().isEmpty()) {
            this.appointmentName = appointmentName;
        }

        // 날짜 수정: null이 아니면 업데이트
        if (appointmentDate != null) {
            this.appointmentDate = appointmentDate;
        }

        // 아이콘 수정: null이 아니면 유효성 검사 후 업데이트
        if (iconType != null) {
            if (iconType < 1 || iconType > MAX_ICON_TYPE) {
                throw new IllegalArgumentException("아이콘 타입은 1부터 " + MAX_ICON_TYPE + " 사이여야 합니다.");
            }
            this.iconType = iconType;
        }
    }
}