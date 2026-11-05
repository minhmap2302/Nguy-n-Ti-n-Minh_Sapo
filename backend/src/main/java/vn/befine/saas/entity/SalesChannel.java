package vn.befine.saas.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class SalesChannel {
  @Id public String id;
  public String storeId;
  public String name;
  public String type;
  public String status;
  public Long revenue = 0L;
  public Integer orders = 0;
  public String sync;
  public String icon;
  public String url;
  public String apiProvider;
  public String externalStoreId;
  public String apiStatus;
  public String lastSyncAt;
  public String syncDirection;
  public String webhookUrl;
  @Column(length = 1500) public String notes;
}
