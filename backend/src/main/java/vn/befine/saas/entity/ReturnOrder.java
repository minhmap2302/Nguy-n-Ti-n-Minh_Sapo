package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.*;


@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class ReturnOrder {
  @Id public String id;
  public String storeId;
  public String date;
  public String orderId;
  public String customer;
  public String product;
  public Integer qty = 0;
  public Long amount = 0L;
  @Column(length = 1000) public String reason;
  public String status;
  public String handler;
}
