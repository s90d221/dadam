package com.example.dadambackend.domain.balance.service;

import com.example.dadambackend.common.ai.AiClient;
import com.example.dadambackend.domain.balance.dto.BalanceGameGenerationResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
@RequiredArgsConstructor
public class BalanceGameAiService {

    private final AiClient aiClient;
    private final ObjectMapper objectMapper;
    private final Random random = new Random();

    public BalanceGameGenerationResult generate() {

        // 🔹 서버에서 먼저 밸런스게임 주제 카테고리 랜덤 선택
        String[] categories = {"FOOD", "HOBBY", "LIFE", "RELATIONSHIP", "MEMORY"};
        String targetCategory = categories[random.nextInt(categories.length)];

        // 🔹 역할 정의 (system 프롬프트)
        String systemPrompt = """
            너는 세대 간 소통을 돕는 '가족 밸런스 게임 질문 생성기'야.
            정치, 혐오, 폭력, 선정적인 내용은 절대 포함하지 마.
            가족 구성원이 서로를 이해하고 편하게 대화할 수 있는 주제로만 밸런스 게임을 만들어.
            반드시 JSON 형식으로만 응답해야 해.
            """;

        // 🔹 출력 형식 + 규칙 (user 프롬프트)
        String userPrompt = ("""
            아래 형식의 JSON으로만 응답해라.

            형식:
            {
              "question": "질문 문장 (예: 'A vs B, 너의 선택은?')",
              "optionA": "선택지 A (짧은 문장)",
              "optionB": "선택지 B (짧은 문장)",
              "category": "%s"
            }

            규칙:
            - category 필드는 반드시 "%s" 로 설정해라.
            - "%s" 카테고리에 자연스럽게 어울리는 주제로 밸런스 게임을 만들어라.
              예시:
              - FOOD: 음식, 간식, 식습관, 외식 스타일 등
              - HOBBY: 취미, 여가, 즐겨 하는 활동 등
              - LIFE: 생활 패턴, 휴식 스타일, 하루 루틴 등
              - RELATIONSHIP: 가족/친구와의 관계, 소통 방식 등
              - MEMORY: 과거 경험, 추억, 기억에 남는 순간 등
            - question에는 두 선택지를 모두 포함한 한 문장을 자연스럽게 작성해라.
            - optionA, optionB에는 각각의 선택지만 짧고 명확하게 작성해라.
            - JSON 이외의 설명, 말줄임표, 주석, 자연어 문장은 절대 넣지 마라.
            - 이미 흔한 '집에서 쉬기 vs 밖에 나가기' 같은 패턴보다는
              조금 더 구체적이고 다양한 상황을 사용해라.
            """).formatted(targetCategory, targetCategory, targetCategory);

        // 🔹 AiClient 호출 (system + user 프롬프트 전달)
        String json = aiClient.request(systemPrompt, userPrompt);

        try {
            // 🔹 GPT가 만든 JSON을 DTO로 파싱
            return objectMapper.readValue(json, BalanceGameGenerationResult.class);
        } catch (Exception e) {
            // 🔹 실패하면 fallback (더미 데이터)
            BalanceGameGenerationResult fallback = new BalanceGameGenerationResult();
            fallback.setQuestion("가족 여행 스타일, 계획 촘촘 vs 즉흥 자유여행 중 뭐가 더 좋아?");
            fallback.setOptionA("계획 촘촘 여행");
            fallback.setOptionB("즉흥 자유여행");
            fallback.setCategory("LIFE");
            return fallback;
        }
    }
}
