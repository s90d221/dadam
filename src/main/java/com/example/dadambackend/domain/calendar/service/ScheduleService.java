package com.example.dadambackend.domain.calendar.service;

import com.example.dadambackend.domain.calendar.dto.request.ScheduleRequest;
import com.example.dadambackend.domain.calendar.dto.response.ScheduleResponse;
import com.example.dadambackend.domain.calendar.dto.response.ScheduleUpdateResponse;
import com.example.dadambackend.domain.calendar.model.Schedule;
import com.example.dadambackend.domain.calendar.repository.ScheduleRepository;
import com.example.dadambackend.domain.user.model.User;
import com.example.dadambackend.domain.user.repository.UserRepository;
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
    private final UserRepository userRepository;

    /**
     * 일정 등록
     */
    @Transactional
    public ScheduleResponse createSchedule(Long userId, ScheduleRequest request) {

        // 필수값 검증 (프론트에서 막아주지만, 백엔드에서도 한 번 더)
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "약속 이름(title)은 필수입니다.");
        }
        if (request.getDate() == null) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "약속 날짜(date)는 필수입니다.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Schedule schedule = Schedule.create(request, user.getFamilyCode());
        Schedule saved = scheduleRepository.save(schedule);

        return ScheduleResponse.from(saved, isUpcoming(saved.getDate()));
    }

    /**
     * 일정 상세 조회 (수정용)
     */
    public ScheduleUpdateResponse getScheduleForUpdate(Long scheduleId, Long userId) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.GAME_NOT_FOUND, "수정하려는 일정을 찾을 수 없습니다."));

        validateFamilyAccess(schedule, userId);

        return ScheduleUpdateResponse.from(schedule);
    }

    /**
     * 일정 수정
     */
    @Transactional
    public ScheduleResponse updateSchedule(Long scheduleId, Long userId, ScheduleRequest request) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.GAME_NOT_FOUND, "수정하려는 일정을 찾을 수 없습니다."));

        validateFamilyAccess(schedule, userId);

        schedule.update(request);

        return ScheduleResponse.from(schedule, isUpcoming(schedule.getDate()));
    }

    /**
     * 다가오는 일정 목록 조회 (오늘부터 30일)
     */
    public List<ScheduleResponse> getUpcomingSchedules(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        String familyCode = normalize(user.getFamilyCode());
        LocalDate today = LocalDate.now();
        LocalDate end = today.plusDays(UPCOMING_DAYS);

        List<Schedule> schedules =
                scheduleRepository.findByFamilyCodeAndDateBetweenOrderByDateAsc(familyCode, today, end);

        return schedules.stream()
                .map(s -> ScheduleResponse.from(s, true))
                .collect(Collectors.toList());
    }

    /**
     * ✅ NEW
     * 특정 날짜의 일정 목록 조회
     *
     * - date가 null 이면 오늘(LocalDate.now()) 기준으로 조회
     * - 리턴은 ScheduleResponse 리스트
     */
    public List<ScheduleResponse> getSchedulesByDate(LocalDate date, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        String familyCode = normalize(user.getFamilyCode());
        LocalDate targetDate = (date != null) ? date : LocalDate.now();

        List<Schedule> schedules = scheduleRepository.findByFamilyCodeAndDate(familyCode, targetDate);

        return schedules.stream()
                .map(s -> ScheduleResponse.from(s, isUpcoming(s.getDate())))
                .collect(Collectors.toList());
    }

    /**
     * 일정 취소 (삭제)
     */
    @Transactional
    public void cancelSchedule(Long scheduleId, Long userId) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GAME_NOT_FOUND, "취소하려는 일정을 찾을 수 없습니다."));

        validateFamilyAccess(schedule, userId);

        scheduleRepository.delete(schedule);
    }

    private boolean isUpcoming(LocalDate date) {
        long diff = ChronoUnit.DAYS.between(LocalDate.now(), date);
        return diff >= 0 && diff <= UPCOMING_DAYS;
    }

    private void validateFamilyAccess(Schedule schedule, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!normalize(schedule.getFamilyCode()).equals(normalize(user.getFamilyCode()))) {
            throw new BusinessException(ErrorCode.FORBIDDEN_ACCESS, "다른 가족의 일정에는 접근할 수 없습니다.");
        }
    }

    private String normalize(String code) {
        return (code == null || code.isBlank()) ? "" : code.trim();
    }
}
