package com.example.dadambackend.domain.calendar.repository;

import com.example.dadambackend.domain.calendar.model.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    // 다가오는 일정을 위해 오늘부터 30일 후까지의 일정을 조회 (appointmentDate 기준)
    List<Schedule> findByAppointmentDateBetweenOrderByAppointmentDateAsc(LocalDate start, LocalDate end);

    // 특정 날짜의 모든 일정을 조회 (캘린더 전체 표시용)
    List<Schedule> findByAppointmentDate(LocalDate date);
}
