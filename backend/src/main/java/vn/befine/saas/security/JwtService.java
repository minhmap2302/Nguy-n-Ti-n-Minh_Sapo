package vn.befine.saas.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.befine.saas.entity.UserAccount;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {
  private final SecretKey key;
  private final long expirationMs;

  public JwtService(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.expiration-ms:86400000}") long expirationMs
  ) {
    byte[] keyBytes;
    try {
      keyBytes = Decoders.BASE64.decode(secret);
    } catch (Exception ex) {
      keyBytes = secret.getBytes();
    }
    this.key = Keys.hmacShaKeyFor(keyBytes);
    this.expirationMs = expirationMs;
  }

  public String generateToken(UserAccount user) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(user.email)
        .claims(Map.of(
            "uid", user.id == null ? "" : String.valueOf(user.id),
            "storeId", user.storeId == null ? "" : user.storeId,
            "role", user.role == null ? "ADMIN" : user.role,
            "fullName", user.fullName == null ? "" : user.fullName
        ))
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plusMillis(expirationMs)))
        .signWith(key)
        .compact();
  }

  public Claims parseClaims(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
  }

  public String extractEmail(String token) {
    return parseClaims(token).getSubject();
  }

  public long getExpirationSeconds() {
    return expirationMs / 1000;
  }
}
