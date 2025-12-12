package com.example.dadambackend.domain.user.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

@Getter
@Schema(description = "회원가입 요청")
public class SignupRequest {
    @Schema(description = "이메일", example = "user@example.com", required = true)
    private String email;
    
    @Schema(description = "비밀번호", example = "password123", required = true)
    private String password;
    
    @Schema(description = "이름", example = "홍길동", required = true)
    private String name;

    @Schema(description = "가족 내 역할", example = "parent", required = false)
    private String familyRole;

    @Schema(description = "가족 코드(초대코드)", example = "DADAM-ABCD12", required = false)
    private String familyCode;
}

