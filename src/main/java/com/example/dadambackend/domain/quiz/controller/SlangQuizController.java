package com.example.dadambackend.domain.quiz.controller;

import com.example.dadambackend.domain.quiz.dto.SlangQuizTodayResponse;
import com.example.dadambackend.domain.quiz.dto.SlangQuizVoteRequest;
import com.example.dadambackend.domain.quiz.service.SlangQuizService;
import com.example.dadambackend.global.exception.BusinessException;
import com.example.dadambackend.global.exception.ErrorCode;
import com.example.dadambackend.security.JwtTokenProvider;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/quiz")
@RequiredArgsConstructor
@Tag(name = "슬랭 퀴즈", description = "오늘의 슬랭 퀴즈 API")
@SecurityRequirement(name = "Authorization")   // ✅ 프로필과 동일하게 JWT 필요 표시
public class SlangQuizController {

    private final SlangQuizService slangQuizService;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * 오늘자 퀴즈 조회 (가족별로 분리)
     */
    @GetMapping("/today")
    public ResponseEntity<SlangQuizTodayResponse> getTodayQuiz(HttpServletRequest request) {
        Long userId = extractUserIdOrThrow(request);
        SlangQuizTodayResponse quiz = slangQuizService.getOrCreateTodayQuiz(userId);
        return ResponseEntity.ok(quiz);
    }

    /**
     * 오늘자 퀴즈에 투표 (로그인 필수)
     */
    @PostMapping("/today/vote")
    public ResponseEntity<SlangQuizTodayResponse> voteToday(
            HttpServletRequest request,
            @RequestBody SlangQuizVoteRequest voteRequest
    ) {
        Long userId = extractUserIdOrThrow(request);
        SlangQuizTodayResponse quiz =
                slangQuizService.voteToday(userId, voteRequest.getChoiceIndex());
        return ResponseEntity.ok(quiz);
    }

    /* =================== 헬퍼 =================== */

    private Long extractUserIdOrThrow(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
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
