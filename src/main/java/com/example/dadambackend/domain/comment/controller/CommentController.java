package com.example.dadambackend.domain.comment.controller;

import com.example.dadambackend.domain.comment.dto.request.CommentRequest;
import com.example.dadambackend.domain.comment.dto.response.CommentResponse;
import com.example.dadambackend.domain.comment.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/answers/{answerId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /**
     * GET /api/v1/answers/{answerId}/comments
     * 특정 답변에 달린 모든 댓글 조회
     */
    @GetMapping
    public ResponseEntity<List<CommentResponse>> getComments(@PathVariable Long answerId) {
        List<CommentResponse> response = commentService.getCommentsByAnswer(answerId);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/answers/{answerId}/comments
     * 특정 답변에 댓글 작성
     */
    @PostMapping
    public ResponseEntity<Void> createComment(
            @PathVariable Long answerId,
            @RequestBody CommentRequest request) {

        commentService.createComment(answerId, request);

        // 201 Created 응답
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    // TODO: 댓글 수정 및 삭제 기능은 이후에 추가 가능
}
