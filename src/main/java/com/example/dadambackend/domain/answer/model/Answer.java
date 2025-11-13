package com.example.dadambackend.domain.answer.model;

import com.example.dadambackend.domain.question.model.Question;
import com.example.dadambackend.domain.user.model.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "answer")
public class Answer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question; // 어떤 질문에 대한 답변인지

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // 누가 답변했는지

    @Column(nullable = false, length = 1000)
    private String content; // 답변 내용

    @Column(nullable = false)
    private LocalDateTime createdAt;

    // TODO: Family, FamilyMember 등 권한 관련 필드는 Family 도메인 구현 후 연동

    public Answer(Question question, User user, String content) {
        this.question = question;
        this.user = user;
        this.content = content;
        this.createdAt = LocalDateTime.now();
    }
}
