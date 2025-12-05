package com.example.dadambackend.common.ai;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
public class AiClient {

    @Value("${ai.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    // 🔹 OpenAI Chat Completions API URL
    private static final String AI_API_URL = "https://api.openai.com/v1/chat/completions";

    /**
     * GPT에게 프롬프트를 보내고,
     * QuestionGenerationResult 형식의 JSON 문자열을 반환한다.
     * 실패하면 fallback JSON 반환.
     */
    public String request(String prompt) {
        try {
            // 1. 헤더 설정
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            // 2. 요청 바디 구성 (Chat Completions 형식)
            OpenAiRequest body = new OpenAiRequest();
            body.setModel("gpt-4o-mini");

            OpenAiMessage systemMsg = new OpenAiMessage();
            systemMsg.setRole("system");
            systemMsg.setContent("""
                너는 세대 간 소통을 돕는 '가족 대화 질문'만 생성하는 어시스턴트야.
                정치, 혐오, 폭력, 선정적인 내용은 절대 포함하지 마.
                가족이 편하게 대화할 수 있는 따뜻한 질문 한 가지만 만들어.
                """);

            OpenAiMessage userMsg = new OpenAiMessage();
            userMsg.setRole("user");
            userMsg.setContent(prompt);

            body.setMessages(new OpenAiMessage[]{systemMsg, userMsg});

            HttpEntity<OpenAiRequest> entity = new HttpEntity<>(body, headers);

            // 3. OpenAI 호출
            ResponseEntity<OpenAiResponse> response =
                    restTemplate.postForEntity(AI_API_URL, entity, OpenAiResponse.class);

            OpenAiResponse aiResponse = response.getBody();
            if (aiResponse == null) {
                System.out.println("[AiClient] 응답 바디가 null, fallback 사용");
                return buildFallbackJson();
            }

            String generated = aiResponse.getContentText();
            if (generated == null || generated.isBlank()) {
                System.out.println("[AiClient] GPT 내용이 비어있음, fallback 사용");
                return buildFallbackJson();
            }

            // 4. 우리 QuestionGenerationResult 형식 JSON으로 감싸서 반환
            return """
                {
                  "content": "%s",
                  "category": "MEMORY"
                }
                """.formatted(escapeForJson(generated));

        } catch (Exception e) {
            // 여기서 예외가 나면 항상 fallback으로 감
            System.out.println("[AiClient] GPT 호출 실패 → fallback 사용: " + e.getMessage());
            return buildFallbackJson();
        }
    }

    // ================== OpenAI 요청 DTO ==================

    @Data
    @NoArgsConstructor
    private static class OpenAiRequest {
        private String model;
        private OpenAiMessage[] messages;
    }

    @Data
    @NoArgsConstructor
    private static class OpenAiMessage {
        private String role;    // "system", "user", "assistant"
        private String content;
    }

    // ================== OpenAI 응답 DTO ==================

    @Data
    @NoArgsConstructor
    private static class OpenAiResponse {
        private Choice[] choices;

        @Data
        @NoArgsConstructor
        public static class Choice {
            private OpenAiMessage message;
        }

        public String getContentText() {
            try {
                if (choices == null || choices.length == 0) return null;
                OpenAiMessage msg = choices[0].message;
                if (msg == null) return null;
                return msg.getContent();
            } catch (Exception e) {
                return null;
            }
        }
    }

    // ================== Fallback & 유틸 ==================

    private String buildFallbackJson() {
        return """
            {
              "content": "요즘 가장 감사했던 순간은 뭐야?",
              "category": "MEMORY"
            }
            """;
    }

    private String escapeForJson(String text) {
        if (text == null) return "";
        return text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", " ")
                .replace("\r", " ");
    }
}
