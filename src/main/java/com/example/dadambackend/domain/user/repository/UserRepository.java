package com.example.dadambackend.domain.user.repository;

import com.example.dadambackend.domain.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}
