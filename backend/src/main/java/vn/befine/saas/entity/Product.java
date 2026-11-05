package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.*;

@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class Product {
  @Id public String id;
  public String storeId;
  @Column(length = 500) public String name;
  public String sku;
  public String barcode;
  public String category;
  public String brand;
  public Long price = 0L;
  public Long compareAtPrice = 0L;
  public Long cost = 0L;
  public Integer stock = 0;
  public Integer minStock = 0;
  public String warehouse;
  public String status;
  public String image;
  @Column(length = 1500) public String description;
  public String unit;
  public Integer weight = 0;
  public Double taxRate = 0D;
  public String supplier;
  public String seoTitle;
  @Column(length = 1000) public String seoDescription;
  public String seoSlug;

  @ElementCollection(fetch = FetchType.EAGER)
  public List<String> channel = new ArrayList<>();

  @ElementCollection(fetch = FetchType.EAGER)
  public List<String> tags = new ArrayList<>();
}
