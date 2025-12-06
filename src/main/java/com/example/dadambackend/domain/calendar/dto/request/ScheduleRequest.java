package com.example.dadambackend.domain.calendar.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ScheduleRequest {
    // String은 null 허용 (수정 시 미전송되면 null)
    private String appointmentName;

    // LocalDate는 객체 타입이므로 null 허용
    private LocalDate appointmentDate;

    // int -> Integer로 변경하여 null 허용 (수정 시 미전송되면 null)
    private Integer iconType;
}