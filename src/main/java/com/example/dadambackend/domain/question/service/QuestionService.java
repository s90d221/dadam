package com.example.dadambackend.domain.question.service;

import com.example.dadambackend.domain.question.dto.QuestionGenerationResult;
import com.example.dadambackend.domain.question.model.Question;
import com.example.dadambackend.domain.question.model.QuestionCategory;
import com.example.dadambackend.domain.question.repository.QuestionRepository;
import com.example.dadambackend.global.exception.BusinessException;
import com.example.dadambackend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final QuestionAiService questionAiService;

    /**
     * 오늘의 질문을 가져옵니다.
     * - DB에 오늘(questionDate == 오늘) 질문이 있으면 그대로 반환
     * - 없으면 AI가 새 질문을 생성하고 저장한 뒤 반환
     */
    @Transactional // 저장이 일어날 수 있으므로 readOnly 해제
    public Question getTodayQuestion() {
        LocalDate today = LocalDate.now();

        return questionRepository.findByQuestionDate(today)
                .orElseGet(() -> createTodayQuestionFromAi(today));
    }

    /**
     * 특정 날짜의 질문을 조회합니다. (과거 검색용)
     */
    public Question getQuestionByDate(LocalDate date) {
        return questionRepository.findByQuestionDate(date)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUESTION_NOT_FOUND));
    }

    /**
     * (중요) 특정 ID로 질문을 조회합니다.
     * AnswerService에서 유효성 검사용으로 사용됩니다.
     */
    public Question getQuestionById(Long questionId) {
        return questionRepository.findById(questionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUESTION_NOT_FOUND));
    }

    /**
     * AI를 호출해 오늘의 질문을 생성하고 저장한 뒤 반환합니다.
     */
    private Question createTodayQuestionFromAi(LocalDate today) {
        // 1. AI에게 질문 생성 요청
        QuestionGenerationResult result = questionAiService.generateDailyQuestion();

        // 2. category 문자열을 enum으로 변환
        QuestionCategory category;
        try {
            category = QuestionCategory.valueOf(result.getCategory());
        } catch (Exception e) {
            // 혹시 AI가 이상한 카테고리를 주면 fallback
            category = QuestionCategory.MEMORY;
        }

        // 3. 새 Question 엔티티 생성
        Question question = new Question(
                result.getContent(),
                category,
                today
        );

        // 4. 저장 후 반환
        return questionRepository.save(question);
    }

    /**
     * 초기 데이터 생성: DB가 비어 있을 때 기본 질문 1개를 넣어줍니다.
     */
    @Transactional
    public void createInitialQuestion() {
        if (questionRepository.count() == 0) {
            Question initialQuestion = new Question(
                    "가족과 함께한 가장 즐거웠던 여행은 무엇인가요?",
                    QuestionCategory.TRAVEL,
                    LocalDate.now()
            );
            questionRepository.save(initialQuestion);
        }
    }
}
