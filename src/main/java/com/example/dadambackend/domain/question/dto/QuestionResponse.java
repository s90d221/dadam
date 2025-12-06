package com.example.dadambackend.domain.question.dto;

import com.example.dadambackend.domain.question.model.Question;
import com.example.dadambackend.domain.question.model.QuestionCategory;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class QuestionResponse {
    private final Long id;
    private final String content;
    private final QuestionCategory category;
    private final LocalDateTime createdAt;
    // private final LocalDate assignedDate; // 필요하다면 추가할 수 있습니다.

    /**
     * (수정) Question 객체만 받아 QuestionResponse를 생성하는 팩토리 메서드입니다.
     * 오늘의 질문 조회에 사용됩니다.
     */
    public static QuestionResponse of(Question question) {
        return QuestionResponse.builder()
                .id(question.getId())
                .content(question.getContent())
                .category(question.getCategory())
                .createdAt(question.getCreatedAt())
                .build();
    }

    /* * [참고: 필요하다면 assignedDate를 받는 버전도 유지할 수 있습니다.]
     * public static QuestionResponse of(Question question, LocalDate assignedDate) {
     * return QuestionResponse.builder()
     * .id(question.getId())
     * .content(question.getContent())
     * .category(question.getCategory())
     * .createdAt(question.getCreatedAt())
     * .assignedDate(assignedDate) // 할당 날짜 포함
     * .build();
     * }
     */
}