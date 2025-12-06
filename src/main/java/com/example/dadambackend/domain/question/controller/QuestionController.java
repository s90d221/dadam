package com.example.dadambackend.domain.question.controller;

import com.example.dadambackend.domain.question.dto.QuestionResponse;
import com.example.dadambackend.domain.question.model.Question;
import com.example.dadambackend.domain.question.service.QuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;

    /**
     * 오늘의 질문 조회
     */
    @GetMapping("/today")
    public ResponseEntity<QuestionResponse> getTodayQuestion() {
        Question question = questionService.getTodayQuestion();
        return ResponseEntity.ok(QuestionResponse.of(question));
    }

    /**
     * 특정 날짜의 질문 조회
     * 예: GET /api/v1/questions/by-date?date=2025-12-01
     */
    @GetMapping("/by-date")
    public ResponseEntity<QuestionResponse> getQuestionByDate(
            @RequestParam("date")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        Question question = questionService.getQuestionByDate(date);
        return ResponseEntity.ok(QuestionResponse.of(question));
    }
}
