package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.*;


@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class InventoryLog {
  @Id public String id;
  public String storeId;
  public String date;
  public String type;
  public String productId;
  @Column(length = 500) public String product;
  public String sku;
  public Integer qty = 0;
  public String warehouse;
  @Column(length = 1000) public String note;
  public String staff;
}
