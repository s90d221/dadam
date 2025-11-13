package com.example.dadambackend.global.response;

import com.example.dadambackend.global.exception.BusinessException;
import com.example.dadambackend.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException e) {
        log.error("Business Exception: {}", e.getMessage(), e);
        ErrorCode errorCode = e.getErrorCode();
        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(new ErrorResponse(errorCode.getMessage(), e.getMessage()));
    }

    // 다른 Exception Handler들 (MethodArgumentNotValidException 등)은 생략

    private record ErrorResponse(String errorCode, String message) {
        // 응답 래퍼 구조에 맞춰 조정 가능
    }
}