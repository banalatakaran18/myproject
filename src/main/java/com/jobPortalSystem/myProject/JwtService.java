
package com.jobPortalSystem.myProject;

import java.time.Instant;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final JwtEncoder jwtEncoder;

    public JwtService(JwtEncoder jwtEncoder) {
        this.jwtEncoder = jwtEncoder;
    }

    public String generateToken(
            Long userId, String email, String role) {

        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("job-portal")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(3600))
                .subject(email)
                .claim("userId", userId)
                .claim("role", role)
                .build();

        return jwtEncoder.encode(
                        JwtEncoderParameters.from(
                                org.springframework.security.oauth2.jwt.JwsHeader
                                        .with(MacAlgorithm.HS256)
                                        .build(),
                                claims))
                .getTokenValue();
    }
}
