
package com.jobPortalSystem.myProject.controller;

import com.jobPortalSystem.myProject.entity.Job;
import com.jobPortalSystem.myProject.entity.JobApplication;
import com.jobPortalSystem.myProject.repository.JobApplicationRepository;
import com.jobPortalSystem.myProject.repository.JobRepository;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.jobPortalSystem.myProject.entity.User;
import com.jobPortalSystem.myProject.repository.UserRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController
@RequestMapping("/api/applications")
@CrossOrigin(origins = "http://localhost:5173")
public class JobApplicationController {

    private final JobApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;

    public JobApplicationController(
            JobApplicationRepository applicationRepository,
            JobRepository jobRepository,
            UserRepository userRepository) {

        this.applicationRepository = applicationRepository;
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/my")
    public List<JobApplication> getMyApplications(
            @RequestParam String email) {
        return applicationRepository.findByEmailIgnoreCase(email);
    }

    @GetMapping
    public List<JobApplication> getAllApplications() {
        return applicationRepository.findAll();
    }

    // Existing JSON endpoint: preserves the old Apply Now flow.
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public JobApplication applyForJob(
            @RequestBody ApplicationRequest request) {

        validateCandidate(request.getApplicantName(), request.getEmail());

        if (request.getJobId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Job ID is required");
        }

        Job job = jobRepository.findById(request.getJobId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Job not found"));

        JobApplication application = new JobApplication();
        application.setApplicantName(request.getApplicantName().trim());
        application.setEmail(request.getEmail().trim());
        application.setPhoneNumber(request.getPhoneNumber());
        application.setTwelfthMarks(request.getTwelfthMarks());
        application.setGraduationMarks(request.getGraduationMarks());
        application.setCurrentQualification(request.getCurrentQualification());
        application.setTechnicalSkills(request.getTechnicalSkills());
        application.setResumeUrl(request.getResumeUrl());
        application.setJob(job);
        application.setStatus("Pending");

        return applicationRepository.save(application);
    }

    // New endpoint: saves candidate details and PDF in PostgreSQL.
    @PostMapping(value = "/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public JobApplication applyWithResume(
            @RequestParam String applicantName,
            @RequestParam String email,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(required = false) Double twelfthMarks,
            @RequestParam(required = false) Double graduationMarks,
            @RequestParam(required = false) String currentQualification,
            @RequestParam(required = false) String technicalSkills,
            @RequestParam Long jobId,
            @RequestParam("resume") MultipartFile resume) {

        validateCandidate(applicantName, email);

        if (resume == null || resume.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Resume PDF is required");
        }

        // Limit the PDF upload to 5 MB.
        if (resume.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Resume must be 5 MB or smaller");
        }

        String filename = resume.getOriginalFilename();
        if (filename == null
                || !filename.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Only PDF resumes are allowed");
        }

        // Check the PDF file signature as well as its extension.
        try {
            byte[] pdf = resume.getBytes();

            if (pdf.length < 5
                    || pdf[0] != '%'
                    || pdf[1] != 'P'
                    || pdf[2] != 'D'
                    || pdf[3] != 'F'
                    || pdf[4] != '-') {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Invalid PDF file");
            }

            Job job = jobRepository.findById(jobId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Job not found"));

            JobApplication application = new JobApplication();
            application.setApplicantName(applicantName.trim());
            application.setEmail(email.trim());
            application.setPhoneNumber(phoneNumber);
            application.setTwelfthMarks(twelfthMarks);
            application.setGraduationMarks(graduationMarks);
            application.setCurrentQualification(currentQualification);
            application.setTechnicalSkills(technicalSkills);

            application.setResumeData(pdf);
            application.setResumeFileName("resume.pdf");
            application.setResumeContentType("application/pdf");
            application.setResumeUrl(null);

            application.setJob(job);
            application.setStatus("Pending");

            return applicationRepository.save(application);

        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Could not read resume PDF");
        }
    }
    // Apply using the resume saved in the candidate's profile.
    @PostMapping(
            value = "/from-profile",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public JobApplication applyUsingProfileResume(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(required = false) Double twelfthMarks,
            @RequestParam(required = false) Double graduationMarks,
            @RequestParam(required = false) String currentQualification,
            @RequestParam(required = false) String technicalSkills,
            @RequestParam Long jobId) {

        if (jwt == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please login again."
            );
        }

        User user = userRepository.findByEmail(jwt.getSubject())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found."
                ));

        if (user.getProfileResumeData() == null
                || user.getProfileResumeData().length == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please upload your profile resume before applying."
            );
        }

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Job not found."
                ));

        JobApplication application = new JobApplication();

        application.setApplicantName(user.getName());
        application.setEmail(user.getEmail());
        application.setPhoneNumber(phoneNumber);
        application.setTwelfthMarks(twelfthMarks);
        application.setGraduationMarks(graduationMarks);
        application.setCurrentQualification(currentQualification);
        application.setTechnicalSkills(technicalSkills);

        // Copy the saved profile PDF into this application
        // so the existing Admin resume-viewing API continues to work.
        application.setResumeData(user.getProfileResumeData());
        application.setResumeFileName(
                user.getProfileResumeFileName()
        );
        application.setResumeContentType(
                user.getProfileResumeContentType()
        );
        application.setResumeUrl(null);

        application.setJob(job);
        application.setStatus("Pending");

        return applicationRepository.save(application);
    }

    // Admin can open or download a candidate's PDF.
    @GetMapping("/{id}/resume")
    public ResponseEntity<byte[]> getResume(@PathVariable Long id) {

        JobApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Application not found"));

        byte[] pdf = application.getResumeData();

        if (pdf == null || pdf.length == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Resume PDF not available");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
                ContentDisposition.inline()
                        .filename("resume.pdf")
                        .build());
        headers.setContentLength(pdf.length);
        headers.setCacheControl("no-store");

        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    @PutMapping("/{id}/status")
    public JobApplication updateApplicationStatus(
            @PathVariable Long id,
            @RequestBody StatusRequest request) {

        JobApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Application not found"));

        String status = request.getStatus();

        if (status == null
                || !(status.equals("Pending")
                || status.equals("Shortlisted")
                || status.equals("Selected")
                || status.equals("Rejected"))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid application status");
        }
        if ("Selected".equalsIgnoreCase(application.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Selected application is final and cannot be changed."
            );
        }

        application.setStatus(status);
        return applicationRepository.save(application);
    }

    // Delete an application belonging to the logged-in job seeker.
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMyApplication(
            @PathVariable Long id) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please log in to delete your application"
            );
        }

        JobApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Application not found"
                ));

        String loggedInEmail = authentication.getName();

        if (application.getEmail() == null
                || !application.getEmail().equalsIgnoreCase(loggedInEmail)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You can delete only your own applications"
            );
        }

        applicationRepository.delete(application);

        return ResponseEntity.noContent().build();
    }
    private void validateCandidate(String name, String email) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Candidate name is required");
        }

        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Email is required");
        }
    }

    public static class ApplicationRequest {
        private String applicantName;
        private String email;
        private String phoneNumber;
        private Double twelfthMarks;
        private Double graduationMarks;
        private String currentQualification;
        private String technicalSkills;
        private String resumeUrl;
        private Long jobId;

        public String getApplicantName() { return applicantName; }
        public void setApplicantName(String applicantName) {
            this.applicantName = applicantName;
        }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
        }

        public Double getTwelfthMarks() { return twelfthMarks; }
        public void setTwelfthMarks(Double twelfthMarks) {
            this.twelfthMarks = twelfthMarks;
        }

        public Double getGraduationMarks() { return graduationMarks; }
        public void setGraduationMarks(Double graduationMarks) {
            this.graduationMarks = graduationMarks;
        }

        public String getCurrentQualification() {
            return currentQualification;
        }
        public void setCurrentQualification(String currentQualification) {
            this.currentQualification = currentQualification;
        }

        public String getTechnicalSkills() { return technicalSkills; }
        public void setTechnicalSkills(String technicalSkills) {
            this.technicalSkills = technicalSkills;
        }

        public String getResumeUrl() { return resumeUrl; }
        public void setResumeUrl(String resumeUrl) {
            this.resumeUrl = resumeUrl;
        }

        public Long getJobId() { return jobId; }
        public void setJobId(Long jobId) { this.jobId = jobId; }
    }

    public static class StatusRequest {
        private String status;

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
