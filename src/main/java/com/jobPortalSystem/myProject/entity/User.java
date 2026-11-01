
package com.jobPortalSystem.myProject.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role = "JOB_SEEKER";

    private String phone;
    private String location;
    private String education;
    private String skills;
    private String experience;
    @Column(name = "profile_resume_data", columnDefinition = "BYTEA")
    private byte[] profileResumeData;

    @Column(name = "profile_resume_file_name")
    private String profileResumeFileName;

    @Column(name = "profile_resume_content_type")
    private String profileResumeContentType;

    private LocalDateTime createdAt = LocalDateTime.now();

    public User() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getEducation() {
        return education;
    }

    public void setEducation(String education) {
        this.education = education;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }

    public String getExperience() {
        return experience;
    }

    public void setExperience(String experience) {
        this.experience = experience;
    }
    public byte[] getProfileResumeData() {
        return profileResumeData;
    }

    public void setProfileResumeData(byte[] profileResumeData) {
        this.profileResumeData = profileResumeData;
    }

    public String getProfileResumeFileName() {
        return profileResumeFileName;
    }

    public void setProfileResumeFileName(String profileResumeFileName) {
        this.profileResumeFileName = profileResumeFileName;
    }

    public String getProfileResumeContentType() {
        return profileResumeContentType;
    }

    public void setProfileResumeContentType(String profileResumeContentType) {
        this.profileResumeContentType = profileResumeContentType;
    }
}
