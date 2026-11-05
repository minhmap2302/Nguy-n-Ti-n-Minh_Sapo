 package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.*;


@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class OrderItem {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;
  public String productId;
  @Column(length = 500) public String name;
  public Integer qty = 0;
  public Long price = 0L;
}
