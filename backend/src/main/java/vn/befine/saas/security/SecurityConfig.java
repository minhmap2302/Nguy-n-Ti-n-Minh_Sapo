package vn.befine.saas.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
  private final JwtAuthenticationFilter jwtFilter;

  public SecurityConfig(JwtAuthenticationFilter jwtFilter) {
    this.jwtFilter = jwtFilter;
  }

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable())
        .cors(Customizer.withDefaults())
        .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .exceptionHandling(ex -> ex
            .authenticationEntryPoint((request, response, authException) -> {
              response.setStatus(401);
              response.setContentType("application/json;charset=UTF-8");
              response.getWriter().write("{\"success\":false,\"message\":\"Vui lòng đăng nhập hoặc token đã hết hạn\"}");
            })
            .accessDeniedHandler((request, response, accessDeniedException) -> {
              response.setStatus(403);
              response.setContentType("application/json;charset=UTF-8");
              response.getWriter().write("{\"success\":false,\"message\":\"Bạn không có quyền thực hiện thao tác này\"}");
            })
        )
        .authorizeHttpRequests(auth -> auth
            // server.servlet.context-path đã là /api, nên KHÔNG thêm /api ở đây.
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/health", "/uploads/**").permitAll()
            .requestMatchers(HttpMethod.POST, "/auth/login", "/auth/register").permitAll()
            .requestMatchers("/error").permitAll()

            .requestMatchers("/auth/me", "/auth/refresh", "/auth/change-password", "/auth/permissions").authenticated()
            .requestMatchers(HttpMethod.POST, "/uploads/users").authenticated()

            // Dữ liệu tổng hợp được lọc tiếp trong controller theo permission.
            .requestMatchers(HttpMethod.GET, "/state").authenticated()
            .requestMatchers(HttpMethod.PUT, "/state").hasAuthority(perm(PermissionCatalog.SETTINGS_MANAGE))

            .requestMatchers(HttpMethod.GET, "/dashboard").hasAuthority(perm(PermissionCatalog.DASHBOARD_VIEW))

            .requestMatchers(HttpMethod.GET, "/products", "/products/**", "/exports/products.csv").hasAuthority(perm(PermissionCatalog.PRODUCTS_VIEW))
            .requestMatchers(HttpMethod.POST, "/uploads/products").hasAuthority(perm(PermissionCatalog.PRODUCTS_MANAGE))
            .requestMatchers("/products", "/products/**").hasAuthority(perm(PermissionCatalog.PRODUCTS_MANAGE))

            .requestMatchers(HttpMethod.GET, "/orders", "/orders/*/invoice.html", "/exports/orders.csv").hasAuthority(perm(PermissionCatalog.ORDERS_VIEW))
            .requestMatchers(HttpMethod.POST, "/orders/checkout").hasAnyAuthority(perm(PermissionCatalog.POS_USE), perm(PermissionCatalog.ORDERS_MANAGE))
            .requestMatchers("/orders", "/orders/**").hasAuthority(perm(PermissionCatalog.ORDERS_MANAGE))

            .requestMatchers(HttpMethod.GET, "/customers", "/customers/**").hasAuthority(perm(PermissionCatalog.CUSTOMERS_VIEW))
            .requestMatchers("/customers", "/customers/**").hasAuthority(perm(PermissionCatalog.CUSTOMERS_MANAGE))

            .requestMatchers(HttpMethod.GET, "/inventory/**", "/warehouses", "/warehouses/**").hasAuthority(perm(PermissionCatalog.INVENTORY_VIEW))
            .requestMatchers("/inventory/**", "/warehouses", "/warehouses/**").hasAuthority(perm(PermissionCatalog.INVENTORY_MANAGE))

            .requestMatchers(HttpMethod.GET, "/purchases", "/purchases/**").hasAuthority(perm(PermissionCatalog.PURCHASES_VIEW))
            .requestMatchers("/purchases", "/purchases/**").hasAuthority(perm(PermissionCatalog.PURCHASES_MANAGE))
            .requestMatchers(HttpMethod.GET, "/suppliers", "/suppliers/**").hasAuthority(perm(PermissionCatalog.SUPPLIERS_VIEW))
            .requestMatchers("/suppliers", "/suppliers/**").hasAuthority(perm(PermissionCatalog.SUPPLIERS_MANAGE))
            .requestMatchers(HttpMethod.GET, "/returns", "/returns/**").hasAuthority(perm(PermissionCatalog.RETURNS_VIEW))
            .requestMatchers("/returns", "/returns/**").hasAuthority(perm(PermissionCatalog.RETURNS_MANAGE))
            .requestMatchers(HttpMethod.GET, "/promotions", "/promotions/**").hasAuthority(perm(PermissionCatalog.PROMOTIONS_VIEW))
            .requestMatchers("/promotions", "/promotions/**").hasAuthority(perm(PermissionCatalog.PROMOTIONS_MANAGE))
            .requestMatchers(HttpMethod.GET, "/channels", "/channels/**").hasAuthority(perm(PermissionCatalog.CHANNELS_VIEW))
            .requestMatchers("/channels", "/channels/**").hasAuthority(perm(PermissionCatalog.CHANNELS_MANAGE))
            .requestMatchers(HttpMethod.GET, "/cashbook", "/cashbook/**").hasAuthority(perm(PermissionCatalog.CASHBOOK_VIEW))
            .requestMatchers("/cashbook", "/cashbook/**").hasAuthority(perm(PermissionCatalog.CASHBOOK_MANAGE))
            .requestMatchers(HttpMethod.GET, "/staff", "/staff/**").hasAuthority(perm(PermissionCatalog.STAFF_VIEW))
            .requestMatchers("/staff", "/staff/**").hasAuthority(perm(PermissionCatalog.STAFF_MANAGE))

            .requestMatchers(HttpMethod.GET, "/reports/**").hasAuthority(perm(PermissionCatalog.REPORTS_VIEW))

            .requestMatchers(HttpMethod.GET, "/store").hasAuthority(perm(PermissionCatalog.SETTINGS_VIEW))
            .requestMatchers(HttpMethod.POST, "/uploads/stores").hasAuthority(perm(PermissionCatalog.SETTINGS_MANAGE))
            .requestMatchers("/store", "/store/**").hasAuthority(perm(PermissionCatalog.SETTINGS_MANAGE))

            .anyRequest().authenticated()
        )
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  private static String perm(String permission) {
    return PermissionCatalog.authority(permission);
  }
}
