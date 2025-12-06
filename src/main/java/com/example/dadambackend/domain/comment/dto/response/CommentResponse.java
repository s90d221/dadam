package com.example.dadambackend.domain.comment.dto.response;

import com.example.dadambackend.domain.comment.model.Comment;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CommentResponse {
    private Long commentId;
    private Long userId;
    private String userName;
    private String content;
    private LocalDateTime createdAt;

    public static CommentResponse from(Comment comment) {
        return CommentResponse.builder()
                .commentId(comment.getId())
                .userId(comment.getUser().getId())
                .userName(comment.getUser().getName()) // User 엔티티에 getName()이 있다고 가정
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
