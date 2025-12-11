package com.example.dadambackend.domain.calendar.controller;

import com.example.dadambackend.domain.calendar.dto.request.ScheduleRequest;
import com.example.dadambackend.domain.calendar.dto.response.ScheduleResponse;
import com.example.dadambackend.domain.calendar.dto.response.ScheduleUpdateResponse;
import com.example.dadambackend.domain.calendar.service.ScheduleService;
import com.example.dadambackend.global.exception.BusinessException;
import com.example.dadambackend.global.exception.ErrorCode;
import com.example.dadambackend.security.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;   // ✅ 새로 추가
import java.util.List;

@Tag(
        name = "캘린더 (일정 관리)",
        description = "가족 약속 등록, 조회, 수정, 취소 기능을 제공합니다."
)
@RestController
    @RequestMapping("/api/v1/schedules")
    @RequiredArgsConstructor
    public class ScheduleController {

        private final ScheduleService scheduleService;
        private final JwtTokenProvider jwtTokenProvider;

    /**
     * POST /api/v1/schedules
     * 일정 등록
     *
     * 프론트 JSON 예시:
     * {
     *   "title": "토요일 가족 외식",
     *   "date": "2025-11-30",
     *   "time": "18:30",
     *   "place": "집 앞 식당",
     *   "memo": "할머니도 모시기",
     *   "type": "dinner",   // or "trip"
     *   "remind": true
     * }
     */
    @Operation(
            summary = "일정 등록",
            description = "약속 이름(title), 날짜(date), 시간(time), 장소(place), 메모(memo), 타입(type: dinner/trip), 알림 여부(remind)를 받아 일정을 등록합니다."
    )
    @PostMapping
    public ResponseEntity<ScheduleResponse> createSchedule(
            @RequestBody ScheduleRequest request,
            @RequestHeader("Authorization") String authHeader
    ) {
        Long userId = extractUserId(authHeader);
        ScheduleResponse response = scheduleService.createSchedule(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/v1/schedules/upcoming
     * 다가오는 일정 조회 (오늘 기준 30일 이내)
     */
    @Operation(
            summary = "⏳ 다가오는 일정 조회",
            description = "오늘을 기준으로 30일 이내에 있는 가족 약속들을 날짜순으로 조회합니다."
    )
    @GetMapping("/upcoming")
    public ResponseEntity<List<ScheduleResponse>> getUpcomingSchedules(
            @RequestHeader("Authorization") String authHeader
    ) {
        Long userId = extractUserId(authHeader);
        List<ScheduleResponse> response = scheduleService.getUpcomingSchedules(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * ✅ NEW
     * GET /api/v1/schedules?date=2025-12-10
     * 특정 날짜의 일정 목록 조회
     *
     * - date 파라미터가 없으면(LocalDate=null) 오늘 날짜 기준으로 조회
     */
    @Operation(
            summary = "특정 날짜의 일정 목록 조회",
            description = "date=yyyy-MM-dd 쿼리스트링으로 해당 날짜의 가족 약속 목록을 조회합니다. " +
                    "date 파라미터가 없으면 오늘 날짜 기준으로 조회합니다."
    )
    @GetMapping
    public ResponseEntity<List<ScheduleResponse>> getSchedulesByDate(
            @RequestParam(required = false) LocalDate date,
            @RequestHeader("Authorization") String authHeader
    ) {
        Long userId = extractUserId(authHeader);
        List<ScheduleResponse> response = scheduleService.getSchedulesByDate(date, userId);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/schedules/{scheduleId}
     * 일정 상세 조회 (수정용)
     */
    @Operation(
            summary = "일정 상세 조회 (수정용)",
            description = "일정 ID로 기존 일정 정보를 가져옵니다. 수정 모달/폼에 초기값으로 채워 넣을 때 사용합니다."
    )
    @GetMapping("/{scheduleId}")
    public ResponseEntity<ScheduleUpdateResponse> getScheduleForUpdate(
            @PathVariable Long scheduleId,
            @RequestHeader("Authorization") String authHeader
    ) {
        Long userId = extractUserId(authHeader);
        ScheduleUpdateResponse response = scheduleService.getScheduleForUpdate(scheduleId, userId);
        return ResponseEntity.ok(response);
    }

    /**
     * PUT /api/v1/schedules/{scheduleId}
     * 일정 수정
     *
     * - request 에 들어온 필드만 수정되고,
     * - null 인 필드는 기존 값이 유지됩니다.
     */
    @Operation(
            summary = "일정 수정",
            description = "일정 ID로 기존 일정을 수정합니다. 요청 JSON에서 null 로 온 필드는 무시하고, 기존 값이 유지됩니다."
    )
    @PutMapping("/{scheduleId}")
    public ResponseEntity<ScheduleResponse> updateSchedule(
            @PathVariable Long scheduleId,
            @RequestBody ScheduleRequest request,
            @RequestHeader("Authorization") String authHeader
    ) {
        Long userId = extractUserId(authHeader);
        ScheduleResponse response = scheduleService.updateSchedule(scheduleId, userId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/v1/schedules/{scheduleId}
     * 일정 취소 (삭제)
     */
    @Operation(
            summary = "일정 취소",
            description = "일정 ID로 특정 가족 약속을 삭제합니다."
    )
    @DeleteMapping("/{scheduleId}")
    public ResponseEntity<Void> cancelSchedule(
            @PathVariable Long scheduleId,
            @RequestHeader("Authorization") String authHeader
    ) {
        Long userId = extractUserId(authHeader);
        scheduleService.cancelSchedule(scheduleId, userId);
        return ResponseEntity.noContent().build(); // 204 No Content
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        String token = authHeader.substring(7);
        if (!jwtTokenProvider.validateToken(token)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return jwtTokenProvider.getUserIdFromToken(token);
    }
}
