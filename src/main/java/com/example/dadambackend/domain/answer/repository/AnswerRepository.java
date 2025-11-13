package com.example.dadambackend.domain.answer.repository;

import com.example.dadambackend.domain.answer.model.Answer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnswerRepository extends JpaRepository<Answer, Long> {
    // 특정 질문에 대한 모든 답변 조회
    List<Answer> findByQuestionIdOrderByCreatedAtAsc(Long questionId);

    // 특정 질문에 특정 유저가 답변했는지 확인
    boolean existsByQuestionIdAndUserId(Long questionId, Long userId);
}
