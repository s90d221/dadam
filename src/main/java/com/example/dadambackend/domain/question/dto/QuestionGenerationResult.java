package com.example.dadambackend.domain.question.dto;

import lombok.Data;

@Data
public class QuestionGenerationResult {
    private String content;       // 질문 내용
    private String category;      // "TRAVEL", "HOBBY" 같은 enum 이름
}