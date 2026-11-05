package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.*;


@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class StoreInfo {
  @Id public String id = "STORE";
  public String ownerId;
  public String name;
  public String owner;
  public String phone;
  public String email;
  public String address;
  public String city;
  public String logo;
  public String branchAddress;
  public String website;
  public String sourceArea;
  public String slogan;
  public String plan;
  public String taxCode;
  public String currency;
  public String openingHours;

  @Lob
  @Column(columnDefinition = "LONGTEXT")
  public String settingsJson;
}
