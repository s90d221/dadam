package com.example.dadambackend.domain.question.service;

import com.example.dadambackend.common.ai.AiClient;
import com.example.dadambackend.domain.question.dto.QuestionGenerationResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
@RequiredArgsConstructor
public class QuestionAiService {

    private final AiClient aiClient;
    private final ObjectMapper objectMapper;
    private final Random random = new Random();

    public QuestionGenerationResult generateDailyQuestion() {

        // 🔹 오늘은 어떤 카테고리 질문을 만들지 서버에서 먼저 랜덤으로 선택
        String[] categories = {"TRAVEL", "HOBBY", "MEMORY"};
        String targetCategory = categories[random.nextInt(categories.length)];

        // 🔹 역할/성격 정의 (system 프롬프트)
        String systemPrompt = """
            너는 세대 간 소통을 돕는 '가족 대화 질문 생성기'야.
            정치, 혐오, 폭력, 선정적인 내용은 절대 포함하지 마.
            가족이 서로를 더 이해하고 공감할 수 있는 따뜻한 질문만 생성해.
            반드시 JSON 형식으로만 응답해야 해.
            """;

        // 🔹 출력 형식 정의 + 실제 요청 내용 (user 프롬프트)
        String userPrompt = ("""
            아래 형식의 JSON으로만 응답해라.

            형식:
            {
              "content": "질문 내용",
              "category": "%s"
            }

            규칙:
            - content에는 가족이 함께 대화하기 좋은 질문 한 가지만 넣어라.
            - category 필드는 반드시 "%s" 로 설정해라.
            - "%s" 카테고리에 자연스럽게 어울리는 질문을 만들어라.
            - JSON 이외의 설명, 말줄임표, 주석 등은 절대 넣지 마라.
            """).formatted(targetCategory, targetCategory, targetCategory);

        // 🔹 AiClient를 호출해서 JSON 문자열 받기
        String json = aiClient.request(systemPrompt, userPrompt);

        try {
            // 🔹 GPT가 만들어준 JSON을 QuestionGenerationResult로 변환
            return objectMapper.readValue(json, QuestionGenerationResult.class);
        } catch (JsonProcessingException e) {
            // 🔹 실패하면 fallback
            QuestionGenerationResult fallback = new QuestionGenerationResult();
            fallback.setContent("요즘 가장 감사하게 느끼는 일은 뭐야?");
            fallback.setCategory("MEMORY");
            return fallback;
        }
    }
}
