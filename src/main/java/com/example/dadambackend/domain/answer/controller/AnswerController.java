package com.example.dadambackend.domain.answer.controller;

import com.example.dadambackend.domain.answer.dto.request.CreateAnswerRequest;
import com.example.dadambackend.domain.answer.dto.response.AnswerResponse;
import com.example.dadambackend.domain.answer.service.AnswerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/questions")
@RequiredArgsConstructor
public class AnswerController {
    private final AnswerService answerService;

    // TODO: userId는 실제로는 SecurityContext에서 가져와야 함 (임시로 1L 사용)
    private final Long TEMP_USER_ID = 1L;

    /**
     * 특정 질문에 답변을 작성합니다.
     */
    @PostMapping("/{questionId}/answers")
    public ResponseEntity<AnswerResponse> createAnswer(
            @PathVariable Long questionId,
            @Valid @RequestBody CreateAnswerRequest request) {
        AnswerResponse response = answerService.createAnswer(questionId, TEMP_USER_ID, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 특정 질문에 달린 답변 목록을 조회합니다.
     */
    @GetMapping("/{questionId}/answers")
    public ResponseEntity<List<AnswerResponse>> getAnswers(@PathVariable Long questionId) {
        List<AnswerResponse> responses = answerService.getAnswersByQuestionId(questionId);
        return ResponseEntity.ok(responses);
    }
}
