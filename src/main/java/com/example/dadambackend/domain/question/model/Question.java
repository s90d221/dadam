package com.example.dadambackend.domain.question.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "question")
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String content; // 질문 내용

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionCategory category; // 질문 카테고리 (예: TRAVEL, HOBBY)

    @Column(nullable = false)
    private LocalDateTime createdAt;

    // TODO: AI 질문 추천을 위한 만족도/사용 횟수 등의 필드는 추후 추가

    public Question(String content, QuestionCategory category) {
        this.content = content;
        this.category = category;
        this.createdAt = LocalDateTime.now();
    }
}
