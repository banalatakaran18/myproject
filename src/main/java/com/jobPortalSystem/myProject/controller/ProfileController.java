
package com.jobPortalSystem.myProject.controller;

import com.jobPortalSystem.myProject.dto.ProfileUpdateRequest;
import com.jobPortalSystem.myProject.entity.User;
import com.jobPortalSystem.myProject.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/profile")
@CrossOrigin(origins = "http://localhost:5173")
public class ProfileController {

    private final UserRepository userRepository;

    public ProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getProfile(
            @AuthenticationPrincipal Jwt jwt) {

        if (jwt == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please login again."));
        }

        return userRepository.findByEmail(jwt.getSubject())
                .map(user -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("id", user.getId());
                    response.put("name", user.getName());
                    response.put("email", user.getEmail());
                    response.put("role", user.getRole());
                    response.put("phone", user.getPhone());
                    response.put("location", user.getLocation());
                    response.put("education", user.getEducation());
                    response.put("skills", user.getSkills());
                    response.put("experience", user.getExperience());
                    response.put("profileResumeFileName", user.getProfileResumeFileName());

                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "User not found.")));
    }

    @PutMapping
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody ProfileUpdateRequest request) {

        if (jwt == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please login again."));
        }

        return userRepository.findByEmail(jwt.getSubject())
                .map(user -> {
                    if (request.getName() != null
                            && request.getName().isBlank()) {
                        return ResponseEntity.badRequest()
                                .body(Map.of("message",
                                        "Name cannot be empty."));
                    }

                    if (request.getName() != null) {
                        user.setName(request.getName().trim());
                    }
                    if (request.getPhone() != null) {
                        user.setPhone(request.getPhone());
                    }
                    if (request.getLocation() != null) {
                        user.setLocation(request.getLocation());
                    }
                    if (request.getEducation() != null) {
                        user.setEducation(request.getEducation());
                    }
                    if (request.getSkills() != null) {
                        user.setSkills(request.getSkills());
                    }
                    if (request.getExperience() != null) {
                        user.setExperience(request.getExperience());
                    }

                    User saved = userRepository.save(user);

                    Map<String, Object> response = new HashMap<>();
                    response.put("message", "Profile updated successfully");
                    response.put("id", saved.getId());
                    response.put("name", saved.getName());
                    response.put("email", saved.getEmail());
                    response.put("role", saved.getRole());
                    response.put("phone", saved.getPhone());
                    response.put("location", saved.getLocation());
                    response.put("education", saved.getEducation());
                    response.put("skills", saved.getSkills());
                    response.put("experience", saved.getExperience());
                    response.put("profileResumeFileName", user.getProfileResumeFileName());

                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "User not found.")));
    }
    // Upload or replace the logged-in user's profile resume.
    @PostMapping(
            value = "/resume",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<?> uploadProfileResume(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("resume") MultipartFile resume) {

        if (jwt == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please login again."));
        }

        if (resume == null || resume.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Please select a PDF resume."));
        }

        if (resume.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Resume must be 5 MB or smaller."));
        }

        String fileName = resume.getOriginalFilename();

        if (fileName == null
                || !fileName.toLowerCase(java.util.Locale.ROOT).endsWith(".pdf")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Only PDF resumes are allowed."));
        }

        try {
            byte[] pdf = resume.getBytes();

            if (pdf.length < 5
                    || pdf[0] != '%'
                    || pdf[1] != 'P'
                    || pdf[2] != 'D'
                    || pdf[3] != 'F'
                    || pdf[4] != '-') {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Invalid PDF file."));
            }

            User user = userRepository.findByEmail(jwt.getSubject())
                    .orElse(null);

            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "User not found."));
            }

            user.setProfileResumeData(pdf);
            user.setProfileResumeFileName("resume.pdf");
            user.setProfileResumeContentType("application/pdf");

            userRepository.save(user);

            return ResponseEntity.ok(Map.of(
                    "message", "Profile resume uploaded successfully.",
                    "profileResumeFileName", user.getProfileResumeFileName()
            ));

        } catch (IOException ex) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Could not read the PDF file."));
        }
    }


    // View the logged-in user's profile resume.
    @GetMapping(
            value = "/resume",
            produces = MediaType.APPLICATION_PDF_VALUE
    )
    public ResponseEntity<byte[]> viewProfileResume(
            @AuthenticationPrincipal Jwt jwt) {

        if (jwt == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = userRepository.findByEmail(jwt.getSubject())
                .orElse(null);

        if (user == null || user.getProfileResumeData() == null
                || user.getProfileResumeData().length == 0) {
            return ResponseEntity.notFound().build();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
                ContentDisposition.inline()
                        .filename("resume.pdf")
                        .build()
        );
        headers.setCacheControl("no-store");

        return new ResponseEntity<>(
                user.getProfileResumeData(),
                headers,
                HttpStatus.OK
        );
    }
}
