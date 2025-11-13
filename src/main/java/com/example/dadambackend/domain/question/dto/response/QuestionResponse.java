package com.example.dadambackend.domain.question.dto.response;

import com.example.dadambackend.domain.question.model.Question;
import com.example.dadambackend.domain.question.model.QuestionCategory;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class QuestionResponse {
    private Long id;
    private String content;
    private QuestionCategory category;
    private LocalDateTime assignedDate; // 오늘의 질문이 할당된 날짜 (임시로 현재 시간 사용)

    public static QuestionResponse of(Question question) {
        return QuestionResponse.builder()
                .id(question.getId())
                .content(question.getContent())
                .category(question.getCategory())
                .assignedDate(LocalDateTime.now()) // 실제는 QuestionAssignment에서 가져와야 함
                .build();
    }
}
