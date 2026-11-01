package com.jobPortalSystem.myProject.repository;

import com.jobPortalSystem.myProject.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {
}