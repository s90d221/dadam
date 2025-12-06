package com.example.dadambackend.domain.comment.model;

import com.example.dadambackend.domain.answer.model.Answer; // Answer 엔티티 참조
import com.example.dadambackend.domain.user.model.User;
import com.example.dadambackend.global.exception.BusinessException;
import com.example.dadambackend.global.exception.ErrorCode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Comment {

    public static final int MAX_COMMENT_LENGTH = 50; // 글자수 제한 (최대 50자)

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 댓글 내용
    @Column(nullable = false, length = MAX_COMMENT_LENGTH)
    private String content;

    // N:1 관계 - 어떤 답변에 달린 댓글인지
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "answer_id", nullable = false)
    private Answer answer;

    // N:1 관계 - 누가 작성한 댓글인지
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private LocalDateTime createdAt;

    @PrePersist
    public void validateContentLength() {
        if (this.content == null || this.content.length() > MAX_COMMENT_LENGTH) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "댓글은 최대 " + MAX_COMMENT_LENGTH + "자를 초과할 수 없습니다.");
        }
    }

    // 생성자 (댓글 생성용)
    public Comment(Answer answer, User user, String content) {
        this.answer = answer;
        this.user = user;
        this.content = content;
        this.createdAt = LocalDateTime.now();
        validateContentLength(); // 생성 시 유효성 검사
    }
}
