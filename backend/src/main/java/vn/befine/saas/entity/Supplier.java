package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class Supplier {
  @Id public String id;
  public String storeId;
  public String name;
  public String category;
  public String contact;
  public String phone;
  public String email;
  public String address;
  public String taxCode;
  public String website;
  public String bankName;
  public String bankAccount;
  public String paymentTerm;
  @Column(length = 1500) public String note;
  public Double rating = 4.5;
  public Long debt = 0L;
  public String status;
  public String lastImport;
}
