package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class Promotion {
  @Id
  public String id;

  public String storeId;
  public String name;
  public String code;
  public String type;

  @Column(name = "discount_value")
  public Integer value;

  public String startDate;
  public String endDate;
  public String status;

  public String appliesTo;
  public String start;
  public String end;
  public String channel;

  @Column(name = "usage_limit")
  public Integer limit;

  @Column(name = "used_count")
  public Integer used;
}