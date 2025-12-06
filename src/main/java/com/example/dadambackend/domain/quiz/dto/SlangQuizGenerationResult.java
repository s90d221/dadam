package com.example.dadambackend.domain.quiz.dto;

import lombok.Data;

@Data
public class SlangQuizGenerationResult {
    private String question;     // 퀴즈 질문
    private String answer;       // 정답
    private String[] choices;    // 보기 리스트 (정답 포함)
    private String explanation;  // 해설
}
