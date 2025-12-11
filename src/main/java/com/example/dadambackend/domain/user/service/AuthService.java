package com.example.dadambackend.domain.user.service;

import com.example.dadambackend.domain.user.dto.request.LoginRequest;
import com.example.dadambackend.domain.user.dto.request.SignupRequest;
import com.example.dadambackend.domain.user.dto.response.LoginResponse;
import com.example.dadambackend.domain.user.dto.response.UserProfileResponse;
import com.example.dadambackend.domain.user.model.User;
import com.example.dadambackend.domain.user.repository.UserRepository;
import com.example.dadambackend.global.exception.BusinessException;
import com.example.dadambackend.global.exception.ErrorCode;
import com.example.dadambackend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * 회원가입 + 바로 로그인 상태로 토큰/유저 정보 리턴
     */
    public LoginResponse signup(SignupRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException(ErrorCode.USER_ALREADY_EXIST);
        }

        String familyCode = generateUniqueFamilyCode();

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .avatarUrl(null)
                .familyRole("child")   // 기본값
                .familyCode(familyCode)
                .build();

        userRepository.save(user);

        String token = jwtTokenProvider.createToken(user.getId(), user.getEmail());

        return new LoginResponse(
                token,
                UserProfileResponse.from(user)
        );
    }

    /**
     * 회원가입 시 고유한 가족 코드를 생성합니다.
     * - 패턴: "DADAM-" + 대문자/숫자 6자리
     */
    private String generateUniqueFamilyCode() {
        String code;
        do {
            code = "DADAM-" + RandomStringUtils.randomAlphanumeric(6).toUpperCase();
        } while (userRepository.existsByFamilyCode(code));
        return code;
    }

    /**
     * 로그인
     */
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_PASSWORD);
        }

        String token = jwtTokenProvider.createToken(user.getId(), user.getEmail());

        return new LoginResponse(
                token,
                UserProfileResponse.from(user)
        );
    }
}
