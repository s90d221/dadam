package com.example.dadambackend.domain.calendar.controller;

import com.example.dadambackend.domain.calendar.dto.request.ScheduleRequest;
import com.example.dadambackend.domain.calendar.dto.response.ScheduleResponse;
import com.example.dadambackend.domain.calendar.dto.response.ScheduleUpdateResponse;
import com.example.dadambackend.domain.calendar.service.ScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "📅 캘린더 (일정 관리)", description = "약속 등록, 조회, 수정, 취소 기능 제공")
@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    // ... (기존 createSchedule, getUpcomingSchedules 유지)

    /**
     * POST /api/v1/schedules
     * 일정 등록 (약속 이름, 날짜, 아이콘 선택)
     */
    @Operation(summary = "✅ 일정 등록", description = "약속 이름, 날짜, 1~6 사이의 아이콘 타입을 선택하여 일정을 등록합니다.")
    @PostMapping
    public ResponseEntity<ScheduleResponse> createSchedule(@RequestBody ScheduleRequest request) {
        ScheduleResponse response = scheduleService.createSchedule(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/v1/schedules/upcoming
     * 다가오는 일정 조회 (30일 이하로 남은 일정 출력)
     */
    @Operation(summary = "⏳ 다가오는 일정 조회", description = "오늘 기준으로 30일 이하로 남은 일정을 조회합니다.")
    @GetMapping("/upcoming")
    public ResponseEntity<List<ScheduleResponse>> getUpcomingSchedules() {
        List<ScheduleResponse> response = scheduleService.getUpcomingSchedules();
        return ResponseEntity.ok(response);
    }

    // 1. GET /api/v1/schedules/{scheduleId} - 일정 수정 시 기존 정보 제공
    @Operation(summary = "👀 일정 상세 조회 (수정용)", description = "일정 ID를 통해 기존 일정 정보를 가져옵니다. 수정 시 클라이언트 입력창에 채워넣기 위해 사용됩니다.")
    @GetMapping("/{scheduleId}")
    public ResponseEntity<ScheduleUpdateResponse> getScheduleForUpdate(@PathVariable Long scheduleId) {
        ScheduleUpdateResponse response = scheduleService.getScheduleForUpdate(scheduleId);
        return ResponseEntity.ok(response);
    }

    // 2. PUT /api/v1/schedules/{scheduleId} - 일정 수정 기능
    @Operation(summary = "📝 일정 수정", description = "일정 ID를 통해 기존 일정을 수정합니다. 입력하지 않은 필드는 기존 값이 유지됩니다.")
    @PutMapping("/{scheduleId}")
    public ResponseEntity<ScheduleResponse> updateSchedule(
            @PathVariable Long scheduleId,
            @RequestBody ScheduleRequest request) {

        ScheduleResponse response = scheduleService.updateSchedule(scheduleId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/v1/schedules/{scheduleId}
     * 일정 취소 (일정 선택하면 일정에서 삭제)
     */
    @Operation(summary = "❌ 일정 취소", description = "ID를 통해 특정 일정을 취소(삭제)합니다.")
    @DeleteMapping("/{scheduleId}")
    public ResponseEntity<Void> cancelSchedule(@PathVariable Long scheduleId) {
        scheduleService.cancelSchedule(scheduleId);
        return ResponseEntity.noContent().build(); // 204 No Content
    }
}