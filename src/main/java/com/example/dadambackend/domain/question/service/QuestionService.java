package com.example.dadambackend.domain.question.service;

import com.example.dadambackend.domain.question.model.Question;
import com.example.dadambackend.domain.question.repository.QuestionRepository;
import com.example.dadambackend.global.exception.BusinessException;
import com.example.dadambackend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuestionService {
    private final QuestionRepository questionRepository;

    /**
     * 임시로 가장 최근에 생성된 질문을 오늘의 질문으로 가져옵니다.
     * 실제로는 QuestionDistributionJob에 의해 할당된 질문을 가져와야 합니다.
     * @return 오늘의 질문
     */
    public Question getTodayQuestion() {
        return questionRepository.findTopByOrderByCreatedAtDesc()
                .orElseThrow(() -> new BusinessException(ErrorCode.QUESTION_NOT_FOUND));
    }

    // 이 파일에는 임시 질문을 DB에 저장하는 초기화 로직도 추가합니다.
    @Transactional
    public void createInitialQuestion() {
        if (questionRepository.count() == 0) {
            Question initialQuestion = new Question(
                    "가족과 함께한 가장 즐거웠던 여행은 무엇인가요?",
                    com.example.dadambackend.domain.question.model.QuestionCategory.TRAVEL
            );
            questionRepository.save(initialQuestion);
        }
    }
}
