package com.example.dadambackend.domain.comment.repository;

import com.example.dadambackend.domain.comment.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    // 특정 답변(answerId)에 달린 모든 댓글을 최신순으로 조회
    List<Comment> findByAnswerIdOrderByCreatedAtAsc(Long answerId);

    // 1인당 댓글 개수 제한을 위한 메서드
    long countByUserId(Long userId);

    long countByAnswerId(Long answerId);
}
