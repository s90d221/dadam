package com.example.dadambackend.domain.balance.dto;

import lombok.Data;

@Data
public class BalanceGameGenerationResult {
    private String question;
    private String optionA;
    private String optionB;
    private String category;
}