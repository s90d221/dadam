package com.example.dadambackend.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // 400 Bad Request
    // [인자: HttpStatus, code, message]로 수정
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "C001", "잘못된 요청입니다."),
    ALREADY_ANSWERED(HttpStatus.BAD_REQUEST, "C002", "이미 답변을 작성했습니다."),
    USER_ALREADY_EXIST(HttpStatus.BAD_REQUEST, "C003", "이미 존재하는 사용자입니다."),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "C004", "비밀번호가 일치하지 않습니다."),
    ALREADY_PARTICIPATED(HttpStatus.BAD_REQUEST, "G001", "이미 해당 게임에 참여했습니다."),

    // 404 Not Found
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "C005", "사용자를 찾을 수 없습니다."),
    QUESTION_NOT_FOUND(HttpStatus.NOT_FOUND, "Q001", "질문을 찾을 수 없습니다."),
    GAME_NOT_FOUND(HttpStatus.NOT_FOUND, "G002", "현재 활성화된 밸런스 게임을 찾을 수 없습니다."),

    // 500 Internal Server Error
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "E999", "서버 내부 오류입니다.");

    private final HttpStatus httpStatus;
    private final String code; // 오류 코드를 저장할 필드
    private final String message;
}