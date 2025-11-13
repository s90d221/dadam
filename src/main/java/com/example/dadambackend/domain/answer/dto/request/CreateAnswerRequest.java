package com.example.dadambackend.domain.answer.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class CreateAnswerRequest {
    @NotBlank
    @Size(max = 1000, message = "답변은 1000자를 초과할 수 없습니다.")
    private String content;
}
