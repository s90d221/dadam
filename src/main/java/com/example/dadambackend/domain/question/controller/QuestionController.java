package com.example.dadambackend.domain.question.controller;

import com.example.dadambackend.domain.question.dto.response.QuestionResponse;
import com.example.dadambackend.domain.question.model.Question;
import com.example.dadambackend.domain.question.service.QuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/questions")
@RequiredArgsConstructor
public class QuestionController {
    private final QuestionService questionService;

    /**
     * 오늘의 질문을 조회합니다.
     */
    @GetMapping("/today")
    public ResponseEntity<QuestionResponse> getTodayQuestion() {
        Question question = questionService.getTodayQuestion();
        return ResponseEntity.ok(QuestionResponse.of(question));
    }
}
