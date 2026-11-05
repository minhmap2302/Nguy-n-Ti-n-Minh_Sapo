package vn.befine.saas.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class LoginRequest {
  @NotBlank(message = "Email không được để trống")
  @Email(message = "Email không đúng định dạng")
  public String email;

  @NotBlank(message = "Mật khẩu không được để trống")
  public String password;
}
