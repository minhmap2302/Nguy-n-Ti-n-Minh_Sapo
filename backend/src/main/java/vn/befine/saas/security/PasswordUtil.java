package vn.befine.saas.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public final class PasswordUtil {
  private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder(12);

  private PasswordUtil() {}

  public static String hash(String rawPassword) {
    if (rawPassword == null || rawPassword.isBlank()) {
      throw new IllegalArgumentException("Mật khẩu không hợp lệ");
    }
    return ENCODER.encode(rawPassword);
  }

  public static boolean matches(String rawPassword, String hash) {
    if (rawPassword == null || rawPassword.isBlank() || hash == null || hash.isBlank()) return false;
    return ENCODER.matches(rawPassword, hash);
  }
}
