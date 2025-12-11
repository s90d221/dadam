package com.example.dadambackend.domain.answer.controller;

import com.example.dadambackend.domain.answer.dto.request.CreateAnswerRequest;
import com.example.dadambackend.domain.answer.dto.response.AnswerResponse;
import com.example.dadambackend.domain.answer.service.AnswerService;
import com.example.dadambackend.security.JwtTokenProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/questions")
@RequiredArgsConstructor
public class AnswerController {

    private final AnswerService answerService;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * 오늘의 질문에 대한 답변 생성
     */
    @PostMapping("/{questionId}/answers")
    public ResponseEntity<AnswerResponse> createAnswer(
            @PathVariable Long questionId,
            @Valid @RequestBody CreateAnswerRequest request,
            @RequestHeader("Authorization") String authHeader
    ) {
        Long userId = extractUserId(authHeader);

        AnswerResponse response =
                answerService.createAnswer(questionId, userId, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 특정 질문에 대한 답변 목록 조회
     */
    @GetMapping("/{questionId}/answers")
    public ResponseEntity<?> getAnswers(
            @PathVariable Long questionId,
            @RequestHeader("Authorization") String authHeader
    ) {
        Long userId = extractUserId(authHeader);
        return ResponseEntity.ok(answerService.getAnswersByQuestionId(questionId, userId));
    }

    /**
     * 특정 질문에 대한 특정 답변 수정
     * - 본인 답변만 수정 가능
     */
    @PatchMapping("/{questionId}/answers/{answerId}")
    public ResponseEntity<AnswerResponse> updateAnswer(
            @PathVariable Long questionId,
            @PathVariable Long answerId,
            @Valid @RequestBody CreateAnswerRequest request,
            @RequestHeader("Authorization") String authHeader
    ) {
        Long userId = extractUserId(authHeader);

        AnswerResponse response =
                answerService.updateAnswer(questionId, answerId, userId, request);

        return ResponseEntity.ok(response);
    }

    /**
     * 특정 질문에 대한 특정 답변 삭제
     * - 본인 답변만 삭제 가능
     */
    @DeleteMapping("/{questionId}/answers/{answerId}")
    public ResponseEntity<Void> deleteAnswer(
            @PathVariable Long questionId,
            @PathVariable Long answerId,
            @RequestHeader("Authorization") String authHeader
    ) {
        Long userId = extractUserId(authHeader);

        answerService.deleteAnswer(questionId, answerId, userId);

        return ResponseEntity.noContent().build();
    }

    /**
     * Authorization 헤더에서 userId 추출
     * - 형식: "Bearer {token}"
     */
    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // 토큰이 없거나 형식이 잘못된 경우, JwtTokenProvider에서 예외 처리하게 할 수도 있음
            throw new IllegalArgumentException("잘못된 Authorization 헤더 형식입니다.");
        }
        String token = authHeader.replace("Bearer ", "");
        return jwtTokenProvider.getUserIdFromToken(token);
    }
}
