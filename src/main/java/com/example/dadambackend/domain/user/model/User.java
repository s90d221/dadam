package com.example.dadambackend.domain.user.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "app_user") // 'user'는 예약어일 수 있으므로 app_user 사용
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    // TODO: 실제 구현 시 Password, Role 등 추가

    public User(String email) {
        this.email = email;
    }
}
