package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.*;


@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class PurchaseOrderEntity {
  @Id public String id;
  public String storeId;
  public String date;
  public String expectedDate;
  public String supplier;
  public Long total = 0L;
  public Long paid = 0L;
  public String status;
  @Column(length = 1500) public Integer items = 0;
  public String staff;
}
