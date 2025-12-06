package com.example.dadambackend.domain.calendar.dto.response;

import com.example.dadambackend.domain.calendar.model.Schedule;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class ScheduleUpdateResponse {
    private Long id;
    private String appointmentName;
    private LocalDate appointmentDate;
    private int iconType;
    private boolean upcoming;

    public static ScheduleUpdateResponse from(Schedule schedule) {
        return ScheduleUpdateResponse.builder()
                .id(schedule.getId())
                .appointmentName(schedule.getAppointmentName())
                .appointmentDate(schedule.getAppointmentDate())
                .iconType(schedule.getIconType())
                .build();
    }
}