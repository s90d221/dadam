package com.example.dadambackend.domain.answer.service;

import com.example.dadambackend.domain.answer.dto.request.CreateAnswerRequest;
import com.example.dadambackend.domain.answer.dto.response.AnswerResponse;
import com.example.dadambackend.domain.answer.model.Answer;
import com.example.dadambackend.domain.answer.repository.AnswerRepository;
import com.example.dadambackend.domain.question.model.Question;
import com.example.dadambackend.domain.question.service.QuestionService;
import com.example.dadambackend.domain.user.model.User;
import com.example.dadambackend.domain.user.repository.UserRepository; // 임시 사용
import com.example.dadambackend.global.exception.BusinessException;
import com.example.dadambackend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnswerService {
    private final AnswerRepository answerRepository;
    private final QuestionService questionService;
    private final UserRepository userRepository; // User 객체 가져오기 위해 임시 사용

    /**
     * 질문에 대한 답변을 작성합니다.
     * @param questionId 질문 ID
     * @param userId 답변 작성자 ID
     * @param request 답변 요청 DTO
     * @return 생성된 답변 DTO
     */
    @Transactional
    public AnswerResponse createAnswer(Long questionId, Long userId, CreateAnswerRequest request) {
        Question question = questionService.getTodayQuestion(); // 실제로는 questionId로 조회
        if (!question.getId().equals(questionId)) {
            throw new BusinessException(ErrorCode.QUESTION_NOT_FOUND, "현재 질문이 아닙니다.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (answerRepository.existsByQuestionIdAndUserId(questionId, userId)) {
            throw new BusinessException(ErrorCode.ALREADY_ANSWERED);
        }

        // TODO: QuestionPolicy.java의 "모두 답변해야 다음 질문" 규칙 검증 로직 추가 예정

        Answer answer = new Answer(question, user, request.getContent());
        answer = answerRepository.save(answer);

        return AnswerResponse.of(answer);
    }

    /**
     * 특정 질문에 대한 모든 답변을 조회합니다.
     * @param questionId 질문 ID
     * @return 답변 목록 DTO
     */
    public List<AnswerResponse> getAnswersByQuestionId(Long questionId) {
        List<Answer> answers = answerRepository.findByQuestionIdOrderByCreatedAtAsc(questionId);
        return answers.stream()
                .map(AnswerResponse::of)
                .collect(Collectors.toList());
    }
}