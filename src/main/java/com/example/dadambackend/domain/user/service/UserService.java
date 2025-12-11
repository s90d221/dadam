package com.example.dadambackend.domain.user.service;

import com.example.dadambackend.domain.user.model.User;
import com.example.dadambackend.domain.user.repository.UserRepository;
import com.example.dadambackend.global.exception.BusinessException;
import com.example.dadambackend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;

    /**
     * 공통 유저 조회
     */
    public User getById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    /**
     * 프로필 수정 + 가족 코드 처리
     * - name, familyRole, avatarUrl 는 null 이 아닌 값만 변경
     * - familyCode 가 null 이면: 가족 코드는 변경하지 않음
     * - familyCode 가 ""(빈 문자열)이면: 가족 코드 해제
     * - familyCode 가 값이 있으면:
     *      1) 해당 코드를 가진 유저가 있으면 그 가족에 합류
     *      2) 없으면 내가 새 가족 코드의 최초 소유자가 됨
     */
    public User updateProfile(Long userId,
                              String name,
                              String familyRole,
                              String familyCode,
                              String avatarUrl) {

        User user = getById(userId);

        String newFamilyCode = user.getFamilyCode();

        if (familyCode != null) {
            String normalized = familyCode.trim();

            if (normalized.isEmpty()) {
                // 비워서 보냈다면 가족 코드 제거 (원하지 않으면 이 부분 막으면 됨)
                newFamilyCode = null;
            } else {
                // 이미 존재하는 코드면 해당 가족에 합류, 없으면 내가 새 코드의 소유자가 됨
                User owner = userRepository.findByFamilyCode(normalized).orElse(null);
                if (owner != null) {
                    newFamilyCode = owner.getFamilyCode();
                } else {
                    newFamilyCode = normalized;
                }
            }
        }

        user.updateProfile(name, familyRole, newFamilyCode, avatarUrl);
        return user;
    }

    /**
     * 가족 초대 코드 생성 (이미 있으면 기존 거 재사용)
     * - 초대 코드 패턴: "DADAM-" + 랜덤 6자리
     */
    public String generateOrGetFamilyCode(Long userId) {
        User me = getById(userId);

        if (me.getFamilyCode() != null && !me.getFamilyCode().isBlank()) {
            return me.getFamilyCode();
        }

        String code;
        do {
            code = "DADAM-" + RandomStringUtils.randomAlphanumeric(6).toUpperCase();
        } while (userRepository.existsByFamilyCode(code));

        me.updateProfile(null, null, code, null);
        return code;
    }

    /**
     * 같은 familyCode 를 가진 가족 구성원 전체 조회
     * - familyCode 가 없으면 본인만 반환
     */
    @Transactional(readOnly = true)
    public List<User> getFamilyMembers(Long userId) {
        User me = getById(userId);
        String familyCode = me.getFamilyCode();

        if (familyCode == null || familyCode.isBlank()) {
            return Collections.singletonList(me);
        }

        return userRepository.findAllByFamilyCode(familyCode);
    }

    // ⚠️ 회원가입/로그인 로직은 AuthService 로 분리 (여기에 두지 않음)
}
