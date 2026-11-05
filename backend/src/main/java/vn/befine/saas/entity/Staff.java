package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.util.*;

@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class Staff {
  @Id public String id;
  public String storeId;
  public String name;
  public String role;
  public String phone;
  public String email;
  public String avatar;
  public String department;
  public String address;
  public Long salary = 0L;
  public String startDate;
  public Long revenue = 0L;
  public Integer orders = 0;
  public String joinDate;
  public String status;

  // Thông tin tài khoản đăng nhập liên kết với UserAccount.
  public Boolean loginEnabled = false;
  public Long userAccountId;
  public String loginEmail;
  public String systemRole = "SALES";
  public String accountStatus = "inactive";

  @Transient
  @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
  public String accountPassword;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "staff_permissions", joinColumns = @JoinColumn(name = "staff_id"))
  @Column(name = "permission_key")
  public List<String> permissions = new ArrayList<>();
}
