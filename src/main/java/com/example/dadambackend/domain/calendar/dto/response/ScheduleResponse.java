package com.example.dadambackend.domain.calendar.dto.response;

import com.example.dadambackend.domain.calendar.model.Schedule;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class ScheduleResponse {
    private Long id;
    private String appointmentName;
    private LocalDate appointmentDate;
    private int iconType;
    private boolean isUpcoming; // 다가오는 일정 여부

    public static ScheduleResponse from(Schedule schedule, boolean isUpcoming) {
        return ScheduleResponse.builder()
                .id(schedule.getId())
                .appointmentName(schedule.getAppointmentName())
                .appointmentDate(schedule.getAppointmentDate())
                .iconType(schedule.getIconType())
                .isUpcoming(isUpcoming)
                .build();
    }

    public static ScheduleResponse from(Schedule schedule) {
        return ScheduleResponse.builder()
                .id(schedule.getId())
                .appointmentName(schedule.getAppointmentName())
                .appointmentDate(schedule.getAppointmentDate())
                .iconType(schedule.getIconType())
                .isUpcoming(false) // 전체 조회 시에는 기본값 false
                .build();
    }
}
