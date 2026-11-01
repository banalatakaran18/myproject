

package com.jobPortalSystem.myProject.controller;

import com.jobPortalSystem.myProject.JwtService;
import com.jobPortalSystem.myProject.dto.LoginRequest;
import com.jobPortalSystem.myProject.dto.RegisterRequest;
import com.jobPortalSystem.myProject.entity.User;
import com.jobPortalSystem.myProject.service.UserService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;

    public AuthController(
            UserService userService,
            JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<String> register(
            @RequestBody RegisterRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(userService.register(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request) {
        try {
            User user = userService.login(request);

            String token = jwtService.generateToken(
                    user.getId(),
                    user.getEmail(),
                    user.getRole());

            return ResponseEntity.ok(Map.of(
                    "message", "Login successful",
                    "token", token,
                    "id", user.getId(),
                    "name", user.getName(),
                    "email", user.getEmail(),
                    "role", user.getRole()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message", "Invalid email or password"));
        }
    }
}
