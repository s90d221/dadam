package com.example.dadambackend.domain.question.service;

import com.example.dadambackend.common.ai.AiClient;
import com.example.dadambackend.domain.question.dto.QuestionGenerationResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class QuestionAiService {

    private final AiClient aiClient;
    private final ObjectMapper objectMapper;

    public QuestionGenerationResult generateDailyQuestion() {

        String prompt = """
            너는 가족 대화 질문 생성기이다.
            따뜻하고 의미 있는 대화가 나올 수 있는 질문을 JSON 형식으로 출력해라.

            형식:
            {
              "content": "질문 내용",
              "category": "TRAVEL | HOBBY | MEMORY 중 하나"
            }

            JSON만 출력해라.
            """;

        String json = aiClient.request(prompt);

        try {
            return objectMapper.readValue(json, QuestionGenerationResult.class);
        } catch (JsonProcessingException e) {
            // 실패하면 fallback
            QuestionGenerationResult fallback = new QuestionGenerationResult();
            fallback.setContent("요즘 가장 감사하게 느끼는 일은 뭐야?");
            fallback.setCategory("MEMORY");
            return fallback;
        }
    }
}
