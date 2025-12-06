package com.example.dadambackend.domain.quiz.service;

import com.example.dadambackend.domain.quiz.dto.SlangQuizGenerationResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SlangQuizService {

    private final SlangQuizAiService slangQuizAiService;

    public SlangQuizGenerationResult createQuiz() {
        return slangQuizAiService.generate();
    }
}
