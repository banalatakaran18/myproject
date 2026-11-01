
package com.jobPortalSystem.myProject.repository;

import com.jobPortalSystem.myProject.entity.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobApplicationRepository
        extends JpaRepository<JobApplication, Long> {

    List<JobApplication> findByEmailIgnoreCase(String email);
}
