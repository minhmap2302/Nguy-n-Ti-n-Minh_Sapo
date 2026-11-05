package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserAccount {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(unique = true, nullable = false)
  public String email;

  // Chỉ nhận từ request, không lưu/không trả về JSON. Password thật được lưu trong passwordHash.
  @Transient
  @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
  public String password;

  @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
  public String passwordHash;

  public String fullName;
  public String phone;
  public String storeId;
  public String storeName;
  public String storeType;
  public String plan = "BefineSaaS";
  public String avatar;
  public String avatarInitials;
  public String createdAt;
  public String lastLoginAt;
  public String status = "active";
  public String role = "ADMIN";

  // Liên kết 1-1 theo logic với hồ sơ nhân viên. Không dùng quan hệ JPA trực tiếp
  // để tránh vòng lặp JSON và giúp nâng cấp schema cũ an toàn hơn.
  @Column(unique = true)
  public String staffId;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "user_account_permissions", joinColumns = @JoinColumn(name = "user_account_id"))
  @Column(name = "permission_key")
  public Set<String> permissions = new LinkedHashSet<>();
}
