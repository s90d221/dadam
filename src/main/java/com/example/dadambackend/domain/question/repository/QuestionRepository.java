package com.example.dadambackend.domain.question.repository;

import com.example.dadambackend.domain.question.model.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    // 오늘 / 특정 날짜 질문 조회
    Optional<Question> findByQuestionDate(LocalDate questionDate);

    // 가장 최근에 생성된 질문
    Optional<Question> findTopByOrderByCreatedAtDesc();
}
