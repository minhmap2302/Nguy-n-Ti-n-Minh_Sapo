package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.*;

@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class SalesOrder {
  @Id public String id;
  public String storeId;
  public String date;
  public String customer;
  public String phone;
  public String email;
  public String shippingAddress;
  public Long shippingFee = 0L;
  @Column(length = 1000) public String sourceUrl;
  @Column(length = 1500) public String note;
  public Long total = 0L;
  public Long discount = 0L;
  public Long paid = 0L;
  public String status;
  public String payment;
  public String channel;
  public String staff;

  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
  @JoinColumn(name = "order_id")
  public List<OrderItem> items = new ArrayList<>();
}
