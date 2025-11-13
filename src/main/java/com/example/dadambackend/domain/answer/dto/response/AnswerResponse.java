package com.example.dadambackend.domain.answer.dto.response;

import com.example.dadambackend.domain.answer.model.Answer;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AnswerResponse {
    private Long id;
    private Long userId;
    private String userName; // 실제 서비스에서는 User/FamilyMember 정보를 통해 가져와야 함
    private String content;
    private LocalDateTime createdAt;

    public static AnswerResponse of(Answer answer) {
        // TODO: 실제로는 FamilyMember 테이블에서 userName을 가져와야 함
        String userName = answer.getUser().getEmail().substring(0, 3) + "***"; // 임시
        return AnswerResponse.builder()
                .id(answer.getId())
                .userId(answer.getUser().getId())
                .userName(userName)
                .content(answer.getContent())
                .createdAt(answer.getCreatedAt())
                .build();
    }
}
