package com.example.dadambackend.domain.answer.dto.response;

import com.example.dadambackend.domain.answer.model.Answer;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AnswerResponse {

    private Long id;
    private Long userId;
    private String userName;
    private String content;
    private LocalDateTime createdAt;
    private long commentCount;

    // 기존 단일 생성자 (원하면 유지)
    public static AnswerResponse of(Answer answer) {
        return AnswerResponse.builder()
                .id(answer.getId())
                .userId(answer.getUser().getId())
                .userName(answer.getUser().getName())
                .content(answer.getContent())
                .createdAt(answer.getCreatedAt())
                .commentCount(0L)   // 기본값 0
                .build();
    }

    // 댓글 수 포함 버전 (서비스에서 필요한 메서드)
    public static AnswerResponse of(Answer answer, long commentCount) {
        return AnswerResponse.builder()
                .id(answer.getId())
                .userId(answer.getUser().getId())
                .userName(answer.getUser().getName())
                .content(answer.getContent())
                .createdAt(answer.getCreatedAt())
                .commentCount(commentCount)
                .build();
    }
}
