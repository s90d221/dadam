package com.example.dadambackend.domain.balance.controller;

import com.example.dadambackend.domain.balance.dto.BalanceGameGenerationResult;
import com.example.dadambackend.domain.balance.service.BalanceGameService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/balance")
@RequiredArgsConstructor
public class BalanceGameController {

    private final BalanceGameService balanceGameService;

    @GetMapping("/generate")
    public ResponseEntity<BalanceGameGenerationResult> generate() {
        return ResponseEntity.ok(balanceGameService.createBalanceGame());
    }
}
