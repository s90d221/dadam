package com.example.dadambackend.domain.calendar.repository;

import com.example.dadambackend.domain.calendar.model.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    /**
     * 오늘 ~ 30일 뒤까지 일정
     */
    List<Schedule> findByFamilyCodeAndDateBetweenOrderByDateAsc(String familyCode, LocalDate start, LocalDate end);

    /**
     * 특정 날짜의 모든 일정
     */
    List<Schedule> findByFamilyCodeAndDate(String familyCode, LocalDate date);
}
