package com.example.dadambackend.domain.quiz.controller;

import com.example.dadambackend.domain.quiz.dto.SlangQuizGenerationResult;
import com.example.dadambackend.domain.quiz.service.SlangQuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/quiz")
@RequiredArgsConstructor
public class SlangQuizController {

    private final SlangQuizService slangQuizService;

    /**
     * 신조어 객관식 퀴즈 1개 생성
     * GET /api/v1/quiz/generate
     */
    @GetMapping("/generate")
    public ResponseEntity<SlangQuizGenerationResult> generateQuiz() {
        SlangQuizGenerationResult quiz = slangQuizService.createQuiz();
        return ResponseEntity.ok(quiz);
    }
}
