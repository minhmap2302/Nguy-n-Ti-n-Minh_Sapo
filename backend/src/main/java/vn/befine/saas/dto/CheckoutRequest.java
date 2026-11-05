package vn.befine.saas.dto;

import java.util.*;

public class CheckoutRequest {
  public List<CartItem> cart = new ArrayList<>();
  public String customer;
  public String phone;
  public String email;
  public String shippingAddress;
  public Long shippingFee = 0L;
  public String sourceUrl;
  public String note;
  public String payment;
  public String channel;
  public Integer discountPercent = 0;
  public String status;
  public String staff;

  public static class CartItem {
    public String id;
    public String name;
    public Integer qty = 0;
    public Long price = 0L;
    public String sku;
    public String warehouse;
  }
}
