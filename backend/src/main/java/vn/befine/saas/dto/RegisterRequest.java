package vn.befine.saas.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {
  @NotBlank(message = "Họ tên không được để trống")
  public String fullName;

  @NotBlank(message = "Email không được để trống")
  @Email(message = "Email không đúng định dạng")
  public String email;

  @NotBlank(message = "Mật khẩu không được để trống")
  @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
  public String password;

  public String phone;

  @NotBlank(message = "Tên cửa hàng không được để trống")
  public String storeName;

  public String storeType;
  public String plan;
  public String role;
}
