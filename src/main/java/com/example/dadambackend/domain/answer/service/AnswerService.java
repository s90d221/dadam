package com.example.dadambackend.domain.answer.service;

import com.example.dadambackend.domain.answer.dto.request.CreateAnswerRequest;
import com.example.dadambackend.domain.answer.dto.response.AnswerResponse;
import com.example.dadambackend.domain.answer.model.Answer;
import com.example.dadambackend.domain.answer.repository.AnswerRepository;
import com.example.dadambackend.domain.comment.repository.CommentRepository;
import com.example.dadambackend.domain.question.model.Question;
import com.example.dadambackend.domain.question.service.QuestionService;
import com.example.dadambackend.domain.user.model.User;
import com.example.dadambackend.domain.user.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final CommentRepository commentRepository; // 댓글 수 집계용

    /**
     * 특정 질문(questionId)에 대한 답변을 작성합니다.
     *
     * @param questionId 질문 ID
     * @param userId     현재 로그인한 유저 ID (SecurityContext에서 전달)
     * @param request    답변 요청 DTO
     * @return 생성된 답변 DTO
     */
    @Transactional
    public AnswerResponse createAnswer(Long questionId, Long userId, CreateAnswerRequest request) {
        // 1. Question 존재 및 유효성 검사
        Question question = questionService.getQuestionById(questionId);

        // 2. 답변 작성자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 3. 중복 답변 검사: "질문 + 유저" 조합으로 한 번만 허용
        if (answerRepository.existsByQuestionIdAndUserId(questionId, userId)) {
            throw new BusinessException(ErrorCode.ALREADY_ANSWERED);
        }

        // 4. 답변 저장
        Answer answer = new Answer(question, user, request.getContent());
        answer = answerRepository.save(answer);

        // 새로 생성된 답변이므로 댓글 수는 0
        long commentCount = 0L;

        return AnswerResponse.of(answer, commentCount);
    }

    /**
     * 특정 질문에 대한 모든 답변을 조회합니다.
     *
     * @param questionId 질문 ID
     * @return 답변 목록 DTO
     */
    public List<AnswerResponse> getAnswersByQuestionId(Long questionId, Long requesterId) {
        // 질문 유효성 검사
        questionService.getQuestionById(questionId);

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        String familyCode = requester.getFamilyCode();

        List<Answer> answers = answerRepository.findByQuestionIdOrderByCreatedAtAsc(questionId);

        return answers.stream()
                .filter(answer -> isSameFamily(answer.getUser(), familyCode))
                .map(answer -> {
                    long commentCount = commentRepository.countByAnswerId(answer.getId());
                    return AnswerResponse.of(answer, commentCount);
                })
                .collect(Collectors.toList());
    }

    /**
     * 특정 질문에 대한 특정 답변 수정
     * - 해당 답변 작성자만 수정 가능
     *
     * @param questionId 질문 ID
     * @param answerId   답변 ID
     * @param userId     현재 로그인한 유저 ID
     * @param request    수정 내용 DTO (내용 필드 재사용)
     * @return 수정된 답변 DTO
     */
    @Transactional
    public AnswerResponse updateAnswer(Long questionId, Long answerId, Long userId, CreateAnswerRequest request) {
        // 질문 존재 여부만 검증 (답변과의 매칭은 아래에서 확인)
        questionService.getQuestionById(questionId);

        Answer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ANSWER_NOT_FOUND));

        // URL의 questionId와 답변이 참조하는 question이 일치하는지 확인
        if (!answer.getQuestion().getId().equals(questionId)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST);
        }

        // 본인 답변인지 확인
        if (!answer.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_ACCESS);
        }

        // 내용 업데이트
        answer.updateContent(request.getContent());

        // 수정 후에도 createdAt은 그대로 두고, 필요하면 updatedAt 컬럼 추가해서 관리 가능
        long commentCount = commentRepository.countByAnswerId(answer.getId());

        return AnswerResponse.of(answer, commentCount);
    }

    /**
     * 특정 질문에 대한 특정 답변 삭제
     * - 해당 답변 작성자만 삭제 가능
     *
     * @param questionId 질문 ID
     * @param answerId   답변 ID
     * @param userId     현재 로그인한 유저 ID
     */
    @Transactional
    public void deleteAnswer(Long questionId, Long answerId, Long userId) {
        // 질문 존재 여부만 검증
        questionService.getQuestionById(questionId);

        Answer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ANSWER_NOT_FOUND));

        // URL의 questionId와 답변이 참조하는 question이 일치하는지 확인
        if (!answer.getQuestion().getId().equals(questionId)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST);
        }

        // 본인 답변인지 확인
        if (!answer.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_ACCESS);
        }

        // 댓글과의 FK 제약조건에 따라 필요 시 먼저 댓글 삭제
        // 예: commentRepository.deleteByAnswerId(answerId);
        // 현재 구조에 맞게 Comment 엔티티 / 매핑 확인 후 적용

        answerRepository.delete(answer);
    }

    private boolean isSameFamily(User target, String baseFamilyCode) {
        String normalizedBase = normalize(baseFamilyCode);
        String normalizedTarget = normalize(target.getFamilyCode());
        return normalizedBase.equals(normalizedTarget);
    }

    private String normalize(String code) {
        return (code == null || code.isBlank()) ? "" : code.trim();
    }
}
