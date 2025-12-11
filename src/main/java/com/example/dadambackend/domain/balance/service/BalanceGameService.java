package com.example.dadambackend.domain.balance.service;

import com.example.dadambackend.domain.balance.dto.BalanceGameGenerationResult;
import com.example.dadambackend.domain.balance.dto.BalanceGameTodayResponse;
import com.example.dadambackend.domain.balance.dto.BalanceGameVoteRequest;
import com.example.dadambackend.domain.balance.model.BalanceGame;
import com.example.dadambackend.domain.balance.model.BalanceGameVote;
import com.example.dadambackend.domain.balance.repository.BalanceGameRepository;
import com.example.dadambackend.domain.balance.repository.BalanceGameVoteRepository;
import com.example.dadambackend.domain.user.model.User;
import com.example.dadambackend.domain.user.repository.UserRepository;
import com.example.dadambackend.global.exception.BusinessException;
import com.example.dadambackend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BalanceGameService {

    private final BalanceGameRepository balanceGameRepository;
    private final BalanceGameVoteRepository balanceGameVoteRepository;
    private final BalanceGameAiService balanceGameAiService;
    private final UserRepository userRepository;

    // ✅ TEMP_USER_ID 제거
    // private static final Long TEMP_USER_ID = 1L;

    /**
     * 오늘의 밸런스 게임 조회 (없으면 생성)
     */
    @Transactional
    public BalanceGameTodayResponse getOrCreateTodayGame(Long currentUserId) {
        LocalDate today = LocalDate.now();

        BalanceGame game = balanceGameRepository.findByGameDate(today)
                .orElseGet(() -> {
                    BalanceGameGenerationResult gen = balanceGameAiService.generate();
                    BalanceGame newGame = new BalanceGame(
                            today,
                            gen.getQuestion(),
                            gen.getOptionA(),
                            gen.getOptionB(),
                            gen.getCategory()
                    );
                    return balanceGameRepository.save(newGame);
                });

        User requester = userRepository.findById(currentUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        String familyCode = requester.getFamilyCode();

        List<BalanceGameVote> votes = balanceGameVoteRepository.findByBalanceGame(game)
                .stream()
                .filter(vote -> isSameFamily(vote.getUser(), familyCode))
                .toList();

        return BalanceGameTodayResponse.of(game, votes);
    }

    /**
     * 오늘 게임에 투표 (A/B)
     * - 이미 투표했다면 해당 row의 choice만 변경
     * - 여러 사용자가 투표하면 모두 DB에 기록, 응답에 함께 포함
     * - ✅ currentUserId : JWT에서 꺼낸 "현재 로그인한 유저"의 ID
     */
    @Transactional
    public BalanceGameTodayResponse voteToday(Long currentUserId, BalanceGameVoteRequest request) {
        String choice = request.getChoice();
        if (!"A".equalsIgnoreCase(choice) && !"B".equalsIgnoreCase(choice)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }
        choice = choice.toUpperCase();
        final String finalChoice = choice;

        LocalDate today = LocalDate.now();

        // 오늘 게임 없으면 생성
        BalanceGame game = balanceGameRepository.findByGameDate(today)
                .orElseGet(() -> {
                    BalanceGameGenerationResult gen = balanceGameAiService.generate();
                    BalanceGame newGame = new BalanceGame(
                            today,
                            gen.getQuestion(),
                            gen.getOptionA(),
                            gen.getOptionB(),
                            gen.getCategory()
                    );
                    return balanceGameRepository.save(newGame);
                });

        // ✅ JWT에서 받은 currentUserId 기준으로 실제 User 조회
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 이미 투표한 row가 있으면 choice만 변경, 없으면 새로 생성
        BalanceGameVote vote = balanceGameVoteRepository
                .findByBalanceGameAndUser(game, user)
                .orElseGet(() -> new BalanceGameVote(game, user, finalChoice));

        if (vote.getId() == null) {
            balanceGameVoteRepository.save(vote);
        } else {
            vote.updateChoice(finalChoice);
        }

        String familyCode = user.getFamilyCode();

        // 최신 투표 결과 반환 (가족 코드 기준으로 제한)
        List<BalanceGameVote> votes = balanceGameVoteRepository.findByBalanceGame(game)
                .stream()
                .filter(v -> isSameFamily(v.getUser(), familyCode))
                .toList();

        return BalanceGameTodayResponse.of(game, votes);
    }

    private boolean isSameFamily(User user, String familyCode) {
        return normalize(user.getFamilyCode()).equals(normalize(familyCode));
    }

    private String normalize(String code) {
        return (code == null || code.isBlank()) ? "" : code.trim();
    }
}
