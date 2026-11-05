package vn.befine.saas.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.befine.saas.entity.UserAccount;
import vn.befine.saas.repository.UserAccountRepository;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtService jwtService;
  private final UserAccountRepository userRepo;

  public JwtAuthenticationFilter(JwtService jwtService, UserAccountRepository userRepo) {
    this.jwtService = jwtService;
    this.userRepo = userRepo;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      String token = header.substring(7);
      try {
        Claims claims = jwtService.parseClaims(token);
        String email = claims.getSubject();
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
          userRepo.findByEmail(email.toLowerCase())
              .filter(user -> "active".equalsIgnoreCase(user.status == null ? "active" : user.status))
              .ifPresent(user -> {
                user.role = PermissionCatalog.normalizeRole(user.role);
                var auth = new UsernamePasswordAuthenticationToken(user, null, authorities(user));
                SecurityContextHolder.getContext().setAuthentication(auth);
              });
        }
      } catch (Exception ignored) {
        SecurityContextHolder.clearContext();
      }
    }
    filterChain.doFilter(request, response);
  }

  private static List<SimpleGrantedAuthority> authorities(UserAccount user) {
    String role = PermissionCatalog.normalizeRole(user.role);
    List<SimpleGrantedAuthority> list = new ArrayList<>();
    list.add(new SimpleGrantedAuthority("ROLE_" + role));
    if ("OWNER".equals(role)) list.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
    if ("ADMIN".equals(role)) list.add(new SimpleGrantedAuthority("ROLE_MANAGER"));
    if ("MANAGER".equals(role)) list.add(new SimpleGrantedAuthority("ROLE_SALES"));
    PermissionCatalog.effectivePermissions(user).forEach(permission ->
        list.add(new SimpleGrantedAuthority(PermissionCatalog.authority(permission))));
    return list;
  }
}
