package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.*;


@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class CashbookEntry {
  @Id public String id;
  public String storeId;
  public String date;
  public String type;
  public String category;
  public Long amount = 0L;
  public String method;
  public String ref;
  public String staff;
}
