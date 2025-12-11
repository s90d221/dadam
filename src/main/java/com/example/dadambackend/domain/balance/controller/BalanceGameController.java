package com.example.dadambackend.domain.balance.controller;

import com.example.dadambackend.domain.balance.dto.BalanceGameTodayResponse;
import com.example.dadambackend.domain.balance.dto.BalanceGameVoteRequest;
import com.example.dadambackend.domain.balance.service.BalanceGameService;
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
@RequestMapping("/api/v1/balance")
@RequiredArgsConstructor
@Tag(name = "밸런스 게임", description = "오늘의 밸런스 게임 API")
@SecurityRequirement(name = "Authorization")   // ✅ JWT 필요 표시 (Swagger용)
public class BalanceGameController {

    private final BalanceGameService balanceGameService;
    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping("/today")
    public ResponseEntity<BalanceGameTodayResponse> getTodayGame(HttpServletRequest request) {
        Long currentUserId = extractUserIdOrThrow(request);
        return ResponseEntity.ok(balanceGameService.getOrCreateTodayGame(currentUserId));
    }

    @PostMapping("/today/vote")
    public ResponseEntity<BalanceGameTodayResponse> voteToday(
            HttpServletRequest request,
            @RequestBody BalanceGameVoteRequest body
    ) {
        Long currentUserId = extractUserIdOrThrow(request);
        return ResponseEntity.ok(balanceGameService.voteToday(currentUserId, body));
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
