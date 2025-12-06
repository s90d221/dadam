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
     * GPT에게 system + user 프롬프트를 보내고,
     * 응답 message.content 문자열을 그대로 반환한다.
     * (서비스 쪽에서 이 문자열을 JSON이라고 가정하고 파싱)
     * 실패하면 QuestionGenerationResult 형식의 fallback JSON을 반환한다.
     */
    public String request(String systemPrompt, String userPrompt) {
        try {
            // 1. 헤더 설정
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            // 2. 요청 바디 구성 (Chat Completions 형식)
            OpenAiMessage systemMsg = new OpenAiMessage();
            systemMsg.setRole("system");
            systemMsg.setContent(systemPrompt);

            OpenAiMessage userMsg = new OpenAiMessage();
            userMsg.setRole("user");
            userMsg.setContent(userPrompt);

            OpenAiRequest body = new OpenAiRequest();
            body.setModel("gpt-4o-mini");
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

            String content = aiResponse.getContentText();
            if (content == null || content.isBlank()) {
                System.out.println("[AiClient] GPT 내용이 비어있음, fallback 사용");
                return buildFallbackJson();
            }

            // ✅ 서비스 쪽에서 이 content를 JSON이라고 가정하고 파싱함
            return content;

        } catch (Exception e) {
            // 여기서 예외가 나면 항상 fallback으로 감
            System.out.println("[AiClient] GPT 호출 실패 → fallback 사용: " + e.getMessage());
            return buildFallbackJson();
        }
    }

    /**
     * (옵션) 예전처럼 prompt 하나만 받는 버전도 유지해 둠.
     * 공통 systemPrompt를 쓰고 싶은 경우에 사용 가능.
     */
    public String request(String prompt) {
        String systemPrompt = "너는 사용자의 요청에 맞는 JSON을 생성하는 어시스턴트야. " +
                "사용자가 요구한 형식 그대로 JSON만 출력해라.";
        return request(systemPrompt, prompt);
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

    /**
     * 질문 생성용 기본 fallback JSON
     * (QuestionGenerationResult 형태와 맞춤)
     */
    private String buildFallbackJson() {
        return """
            {
              "content": "요즘 가장 감사했던 순간은 뭐야?",
              "category": "MEMORY"
            }
            """;
    }
}
