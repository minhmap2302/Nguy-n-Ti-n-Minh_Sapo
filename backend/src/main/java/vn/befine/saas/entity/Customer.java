package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.*;

@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class Customer {
  @Id public String id;
  public String storeId;
  public String name;
  public String phone;
  public String email;
  public String address;
  public String source;
  public String company;
  public String taxCode;
  public String gender;
  public String birthday;
  public String province;
  public String district;
  @Column(length = 1500) public String note;
  public Integer totalOrders = 0;
  public Long totalSpent = 0L;
  public Long debt = 0L;
  public String tier;
  public String lastOrder;
  public String joinDate;

  @ElementCollection(fetch = FetchType.EAGER)
  public List<String> tags = new ArrayList<>();
}
