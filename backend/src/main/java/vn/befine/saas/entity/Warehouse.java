package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.*;


@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class Warehouse {
  @Id public String id;
  public String storeId;
  public String name;
  public String address;
  public String manager;
  public String status;
}
