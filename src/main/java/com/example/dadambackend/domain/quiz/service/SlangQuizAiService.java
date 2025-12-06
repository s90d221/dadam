package com.example.dadambackend.domain.quiz.service;

import com.example.dadambackend.common.ai.AiClient;
import com.example.dadambackend.domain.quiz.dto.SlangQuizGenerationResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SlangQuizAiService {

    private final AiClient aiClient;
    private final ObjectMapper objectMapper;

    public SlangQuizGenerationResult generate() {

        // 🔹 역할 정의 (system 프롬프트)
        String systemPrompt = """
            너는 10~20대가 실제로 자주 쓰는 한국어 신조어/은어를 가지고
            객관식 퀴즈를 만드는 어시스턴트야.

            규칙:
            - 정치, 혐오, 폭력, 비하, 성적인 표현은 절대 사용하지 마.
            - 가족, 친구끼리 가볍게 풀 수 있는 깨끗하고 안전한 표현만 사용해.
            - 반드시 JSON 형식으로만 응답해야 한다.
            """;

        // 🔹 출력 형식 + 내용 정의 (user 프롬프트)
        String userPrompt = """
            아래 형식의 JSON으로만 응답해라.

            형식:
            {
              "question": "‘OOO’의 의미는 무엇일까?",
              "answer": "정답 문장",
              "choices": [
                "보기1",
                "보기2",
                "보기3"
              ],
              "explanation": "정답에 대한 짧은 해설"
            }

            생성 규칙:
            - 실제 10~20대가 많이 쓰는 신조어/은어를 하나 골라라.
            - question에는 해당 신조어의 의미를 묻는 문장을 자연스럽게 작성해라.
            - answer에는 그 신조어의 정확한 의미를 문장으로 적어라.
            - choices 배열에는 총 3개의 보기를 넣어라.
              - 반드시 answer와 동일한 문장을 포함해야 한다. (정답)
              - 나머지 2개는 그럴듯하지만 틀린 의미로 만들어라.
            - explanation에는 왜 answer가 정답인지, 어떤 상황에서 쓰는지 짧게 설명해라.
            - JSON 이외의 자연어 문장, 설명, 말줄임표, 주석 등은 절대 넣지 마라.
            """;

        // 🔹 AiClient 호출 (system + user 프롬프트 전달)
        String json = aiClient.request(systemPrompt, userPrompt);

        try {
            // 🔹 GPT가 만든 JSON → DTO로 파싱
            return objectMapper.readValue(json, SlangQuizGenerationResult.class);
        } catch (Exception e) {
            // 🔹 실패하면 fallback 퀴즈 반환
            SlangQuizGenerationResult fallback = new SlangQuizGenerationResult();
            fallback.setQuestion("‘갓생 살기’의 의미는 무엇일까?");
            fallback.setAnswer("부지런하고 계획적으로 자기계발하며 사는 삶");
            fallback.setChoices(new String[]{
                    "아무 생각 없이 편하게만 사는 삶",
                    "부지런하고 계획적으로 자기계발하며 사는 삶",
                    "돈을 최대한 많이 버는 삶"
            });
            fallback.setExplanation("‘갓생’은 God(갓) + 인생의 합성어로, 스스로 만족할 만큼 성실하게 사는 삶을 의미해.");
            return fallback;
        }
    }
}
