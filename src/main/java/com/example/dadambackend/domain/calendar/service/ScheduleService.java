package com.example.dadambackend.domain.calendar.service;

import com.example.dadambackend.domain.calendar.dto.request.ScheduleRequest;
import com.example.dadambackend.domain.calendar.dto.response.ScheduleResponse;
import com.example.dadambackend.domain.calendar.dto.response.ScheduleUpdateResponse;
import com.example.dadambackend.domain.calendar.model.Schedule;
import com.example.dadambackend.domain.calendar.repository.ScheduleRepository;
import com.example.dadambackend.global.exception.BusinessException;
import com.example.dadambackend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScheduleService {

    public static final int UPCOMING_DAYS = 30;

    private final ScheduleRepository scheduleRepository;

    /**
     * 일정 등록
     */
    @Transactional
    public ScheduleResponse createSchedule(ScheduleRequest request) {
        // DTO에서 받은 Integer 타입을 int로 변환 (null이 아닌 것이 보장되어야 함 - 등록 시에는 모든 필드가 필수)
        Schedule schedule = new Schedule(
                request.getAppointmentName(),
                request.getAppointmentDate(),
                request.getIconType() // 등록 시에는 null이면 안 되지만, 편의를 위해 Service에서 Integer 처리하지 않음
        );
        Schedule savedSchedule = scheduleRepository.save(schedule);
        return ScheduleResponse.from(savedSchedule, isUpcoming(savedSchedule.getAppointmentDate()));
    }

    /**
     * 일정 상세 조회 (수정 팝업에 기존 데이터 채우기 위함)
     */
    public ScheduleUpdateResponse getScheduleForUpdate(Long scheduleId) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GAME_NOT_FOUND, "수정하려는 일정을 찾을 수 없습니다."));

        return ScheduleUpdateResponse.from(schedule);
    }

    /**
     * 일정 수정 로직 (핵심 수정)
     */
    @Transactional
    public ScheduleResponse updateSchedule(Long scheduleId, ScheduleRequest request) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GAME_NOT_FOUND, "수정하려는 일정을 찾을 수 없습니다."));

        // 기존 값 유지 로직
        // request의 값이 null이면 기존 값을 사용하고, 아니면 request 값을 사용
        String newName = request.getAppointmentName() != null ? request.getAppointmentName() : schedule.getAppointmentName();
        LocalDate newDate = request.getAppointmentDate() != null ? request.getAppointmentDate() : schedule.getAppointmentDate();
        Integer newIconType = request.getIconType() != null ? request.getIconType() : schedule.getIconType(); // ⭐ Integer로 받도록 처리

        // Schedule 엔티티의 update 메서드를 호출하여 수정
        schedule.update(newName, newDate, newIconType);

        return ScheduleResponse.from(schedule, isUpcoming(schedule.getAppointmentDate()));
    }

    /**
     * 다가오는 일정 목록 조회
     */
    public List<ScheduleResponse> getUpcomingSchedules() {
        LocalDate today = LocalDate.now();
        LocalDate maxDate = today.plusDays(UPCOMING_DAYS);

        List<Schedule> schedules = scheduleRepository.findByAppointmentDateBetweenOrderByAppointmentDateAsc(today, maxDate);

        return schedules.stream()
                .map(schedule -> ScheduleResponse.from(schedule, true))
                .collect(Collectors.toList());
    }

    /**
     * 일정 취소 (삭제)
     */
    @Transactional
    public void cancelSchedule(Long scheduleId) {
        if (!scheduleRepository.existsById(scheduleId)) {
            throw new BusinessException(ErrorCode.GAME_NOT_FOUND, "취소하려는 일정을 찾을 수 없습니다.");
        }
        scheduleRepository.deleteById(scheduleId);
    }

    private boolean isUpcoming(LocalDate date) {
        long daysUntil = ChronoUnit.DAYS.between(LocalDate.now(), date);
        return daysUntil >= 0 && daysUntil <= UPCOMING_DAYS;
    }
}