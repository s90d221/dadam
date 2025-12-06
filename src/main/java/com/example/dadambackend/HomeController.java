package com.example.dadambackend;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class HomeController {

    // 컨트롤러가 스캔되는지 확인용
    @GetMapping("/test")
    @ResponseBody
    public String test() {
        return "ok";
    }

    // 루트("/") 요청을 index.html 로 보내기
    @GetMapping("/")
    public String home() {
        // src/main/resources/templates/index.html
        return "index";
    }
}
