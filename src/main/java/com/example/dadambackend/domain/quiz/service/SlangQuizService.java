package com.example.dadambackend.domain.quiz.service;

import com.example.dadambackend.domain.quiz.dto.SlangQuizGenerationResult;
import com.example.dadambackend.domain.quiz.dto.SlangQuizTodayResponse;
import com.example.dadambackend.domain.quiz.model.SlangQuiz;
import com.example.dadambackend.domain.quiz.model.SlangQuizVote;
import com.example.dadambackend.domain.quiz.repository.SlangQuizRepository;
import com.example.dadambackend.domain.quiz.repository.SlangQuizVoteRepository;
import com.example.dadambackend.domain.user.model.User;
import com.example.dadambackend.domain.user.repository.UserRepository;
import com.example.dadambackend.global.exception.BusinessException;
import com.example.dadambackend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SlangQuizService {

    private static final ZoneId ZONE_SEOUL = ZoneId.of("Asia/Seoul");

    private final SlangQuizAiService slangQuizAiService;
    private final SlangQuizRepository slangQuizRepository;
    private final SlangQuizVoteRepository slangQuizVoteRepository;
    private final UserRepository userRepository;

    /**
     * 오늘 날짜 기준 신조어 퀴즈 조회 (없으면 생성)
     * currentUserId가 있으면 내 선택 인덱스도 함께 내려줌
     */
    @Transactional
    public SlangQuizTodayResponse getOrCreateTodayQuiz(Long currentUserId) {
        LocalDate today = LocalDate.now(ZONE_SEOUL);

        // 오늘 퀴즈 조회 or 생성
        SlangQuiz quiz = getOrCreateQuizForDate(today);

        User requester = userRepository.findById(currentUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 투표 + 유저 정보를 fetch join으로 한 번에 조회
        List<SlangQuizVote> votes = slangQuizVoteRepository.findByQuizWithUser(quiz)
                .stream()
                .filter(vote -> isSameFamily(vote.getUser(), requester.getFamilyCode()))
                .toList();

        return SlangQuizTodayResponse.of(quiz, votes, currentUserId);
    }

    /**
     * 오늘자 퀴즈에 투표
     *  - 이미 투표한 유저는 다시 변경 불가 (ALREADY_PARTICIPATED)
     *  - 동시 요청 시 DB unique 제약조건 위반도 ALREADY_PARTICIPATED로 처리
     */
    @Transactional
    public SlangQuizTodayResponse voteToday(Long userId, int choiceIndex) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        LocalDate today = LocalDate.now(ZONE_SEOUL);

        // 1) 오늘 퀴즈 조회 or 생성
        SlangQuiz quiz = getOrCreateQuizForDate(today);

        String[] choiceArr = quiz.getChoiceArray();
        if (choiceIndex < 0 || choiceIndex >= choiceArr.length) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }

        // 2) 유저 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 3) 이미 투표했는지 선조회
        slangQuizVoteRepository.findByQuizAndUser(quiz, user)
                .ifPresent(v -> {
                    throw new BusinessException(ErrorCode.ALREADY_PARTICIPATED);
                });

        // 4) 새 투표 저장 (동시 요청 대비해서 unique 제약조건 예외도 처리)
        try {
            SlangQuizVote vote = new SlangQuizVote(quiz, user, choiceIndex);
            slangQuizVoteRepository.save(vote);
        } catch (DataIntegrityViolationException e) {
            // 동시 요청으로 인한 중복 insert 시 DB에서 unique 제약조건 위반 발생 → 이미 참여한 것으로 간주
            throw new BusinessException(ErrorCode.ALREADY_PARTICIPATED);
        }

        // 5) 최신 결과 반환 (user fetch join)
        List<SlangQuizVote> votes = slangQuizVoteRepository.findByQuizWithUser(quiz)
                .stream()
                .filter(v -> isSameFamily(v.getUser(), user.getFamilyCode()))
                .toList();
        return SlangQuizTodayResponse.of(quiz, votes, userId);
    }

    /**
     * 특정 날짜의 퀴즈를 조회하거나, 없으면 AI로 생성해서 저장
     */
    private SlangQuiz getOrCreateQuizForDate(LocalDate date) {
        return slangQuizRepository
                .findFirstByQuizDateOrderByCreatedAtAsc(date)
                .orElseGet(() -> {
                    SlangQuizGenerationResult generated = slangQuizAiService.generate();

                    // 혹시라도 choices가 비어 있으면 answer 하나로 채워서 DB 제약조건 만족
                    if (generated.getChoices() == null || generated.getChoices().length == 0) {
                        generated.setChoices(new String[]{generated.getAnswer()});
                    }

                    SlangQuiz entity = SlangQuiz.of(date, generated);
                    return slangQuizRepository.save(entity);
                });
    }

    private boolean isSameFamily(User target, String familyCode) {
        return normalize(target.getFamilyCode()).equals(normalize(familyCode));
    }

    private String normalize(String code) {
        return (code == null || code.isBlank()) ? "" : code.trim();
    }
}
