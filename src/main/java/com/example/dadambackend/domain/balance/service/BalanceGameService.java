package com.example.dadambackend.domain.balance.service;

import com.example.dadambackend.domain.balance.dto.BalanceGameGenerationResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BalanceGameService {

    private final BalanceGameAiService balanceGameAiService;

    public BalanceGameGenerationResult createBalanceGame() {
        return balanceGameAiService.generate();
    }
}
