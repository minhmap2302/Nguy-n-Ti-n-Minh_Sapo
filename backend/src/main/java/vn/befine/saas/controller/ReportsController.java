package vn.befine.saas.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import vn.befine.saas.entity.*;
import vn.befine.saas.repository.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/reports")
public class ReportsController {
  private static final String DEFAULT_STORE_ID = "store_befine_default";
  private final ProductRepository productRepo;
  private final CustomerRepository customerRepo;
  private final SalesOrderRepository orderRepo;
  private final InventoryLogRepository inventoryRepo;
  private final CashbookRepository cashbookRepo;

  public ReportsController(ProductRepository productRepo, CustomerRepository customerRepo, SalesOrderRepository orderRepo,
      InventoryLogRepository inventoryRepo, CashbookRepository cashbookRepo) {
    this.productRepo = productRepo;
    this.customerRepo = customerRepo;
    this.orderRepo = orderRepo;
    this.inventoryRepo = inventoryRepo;
    this.cashbookRepo = cashbookRepo;
  }

  @GetMapping("/summary")
  public Map<String, Object> summary(@RequestHeader(value = "X-Store-Id", required = false) String storeId) {
    String sid = resolveStoreId(storeId);
    List<SalesOrder> orders = orderRepo.findByStoreId(sid);
    List<Product> products = productRepo.findByStoreId(sid);
    List<Customer> customers = customerRepo.findByStoreId(sid);
    List<CashbookEntry> cashbook = cashbookRepo.findByStoreId(sid);
    long completedRevenue = orders.stream().filter(o -> "completed".equalsIgnoreCase(empty(o.status, ""))).mapToLong(o -> safe(o.total)).sum();
    long websiteRevenue = orders.stream().filter(o -> "completed".equalsIgnoreCase(empty(o.status, "")) && "Website Befine.vn".equalsIgnoreCase(empty(o.channel, ""))).mapToLong(o -> safe(o.total)).sum();
    long websiteOrders = orders.stream().filter(o -> "Website Befine.vn".equalsIgnoreCase(empty(o.channel, ""))).count();
    long paid = orders.stream().mapToLong(o -> safe(o.paid)).sum();
    long costOfStock = products.stream().mapToLong(p -> safe(p.cost) * safe(p.stock)).sum();
    long potentialRevenue = products.stream().mapToLong(p -> safe(p.price) * safe(p.stock)).sum();
    long lowStock = products.stream().filter(p -> safe(p.stock) <= safe(p.minStock)).count();
    long receipts = cashbook.stream().filter(c -> "receipt".equalsIgnoreCase(empty(c.type, ""))).mapToLong(c -> safe(c.amount)).sum();
    long payments = cashbook.stream().filter(c -> "payment".equalsIgnoreCase(empty(c.type, ""))).mapToLong(c -> safe(c.amount)).sum();
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("revenue", completedRevenue);
    result.put("paid", paid);
    result.put("orders", orders.size());
    result.put("completedOrders", orders.stream().filter(o -> "completed".equalsIgnoreCase(empty(o.status, ""))).count());
    result.put("customers", customers.size());
    result.put("products", products.size());
    result.put("lowStock", lowStock);
    result.put("stockValue", costOfStock);
    result.put("potentialRevenue", potentialRevenue);
    result.put("cashBalance", receipts - payments);
    result.put("grossProfitEstimate", estimateGrossProfit(orders, products));
    result.put("websiteRevenue", websiteRevenue);
    result.put("websiteOrders", websiteOrders);
    return result;
  }

  @GetMapping("/daily-revenue")
  public List<Map<String, Object>> dailyRevenue(@RequestHeader(value = "X-Store-Id", required = false) String storeId,
      @RequestParam(defaultValue = "14") int days) {
    String sid = resolveStoreId(storeId);
    int safeDays = Math.max(1, Math.min(days, 90));
    LocalDate today = LocalDate.now();
    Map<String, List<SalesOrder>> grouped = orderRepo.findByStoreId(sid).stream()
        .filter(o -> "completed".equalsIgnoreCase(empty(o.status, "")))
        .collect(Collectors.groupingBy(o -> extractDate(o.date)));
    List<Map<String, Object>> rows = new ArrayList<>();
    for (int i = safeDays - 1; i >= 0; i--) {
      String date = today.minusDays(i).toString();
      List<SalesOrder> list = grouped.getOrDefault(date, List.of());
      rows.add(Map.of(
          "date", date,
          "revenue", list.stream().mapToLong(o -> safe(o.total)).sum(),
          "orders", list.size()
      ));
    }
    return rows;
  }

  @GetMapping("/top-products")
  public List<Map<String, Object>> topProducts(@RequestHeader(value = "X-Store-Id", required = false) String storeId,
      @RequestParam(defaultValue = "10") int limit) {
    String sid = resolveStoreId(storeId);
    Map<String, Product> productMap = productRepo.findByStoreId(sid).stream().collect(Collectors.toMap(p -> p.id, p -> p, (a, b) -> a));
    Map<String, long[]> stats = new LinkedHashMap<>();
    for (SalesOrder order : orderRepo.findByStoreId(sid)) {
      if (!"completed".equalsIgnoreCase(empty(order.status, "")) || order.items == null) continue;
      for (OrderItem item : order.items) {
        String key = empty(item.productId, item.name);
        long[] arr = stats.computeIfAbsent(key, k -> new long[2]);
        arr[0] += safe(item.qty);
        arr[1] += safe(item.qty) * safe(item.price);
      }
    }
    return stats.entrySet().stream()
        .sorted((a, b) -> Long.compare(b.getValue()[1], a.getValue()[1]))
        .limit(Math.max(1, Math.min(limit, 50)))
        .map(e -> {
          Product p = productMap.get(e.getKey());
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("productId", e.getKey());
          m.put("name", p == null ? e.getKey() : p.name);
          m.put("sku", p == null ? "" : p.sku);
          m.put("qty", e.getValue()[0]);
          m.put("revenue", e.getValue()[1]);
          return m;
        })
        .toList();
  }

  @GetMapping("/inventory")
  public Map<String, Object> inventory(@RequestHeader(value = "X-Store-Id", required = false) String storeId) {
    String sid = resolveStoreId(storeId);
    List<Product> products = productRepo.findByStoreId(sid);
    List<InventoryLog> logs = inventoryRepo.findByStoreId(sid);
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("totalProducts", products.size());
    result.put("stockValue", products.stream().mapToLong(p -> safe(p.cost) * safe(p.stock)).sum());
    result.put("lowStock", products.stream().filter(p -> safe(p.stock) <= safe(p.minStock)).count());
    result.put("outOfStock", products.stream().filter(p -> safe(p.stock) <= 0).count());
    result.put("importQty", logs.stream().filter(l -> "import".equalsIgnoreCase(empty(l.type, ""))).mapToLong(l -> Math.abs(safe(l.qty))).sum());
    result.put("exportQty", logs.stream().filter(l -> "export".equalsIgnoreCase(empty(l.type, ""))).mapToLong(l -> Math.abs(safe(l.qty))).sum());
    return result;
  }

  private long estimateGrossProfit(List<SalesOrder> orders, List<Product> products) {
    Map<String, Product> productMap = products.stream().collect(Collectors.toMap(p -> p.id, p -> p, (a, b) -> a));
    long profit = 0;
    for (SalesOrder order : orders) {
      if (!"completed".equalsIgnoreCase(empty(order.status, "")) || order.items == null) continue;
      for (OrderItem item : order.items) {
        Product p = productMap.get(item.productId);
        long cost = p == null ? 0 : safe(p.cost);
        profit += (safe(item.price) - cost) * safe(item.qty);
      }
    }
    return profit;
  }

  private String resolveStoreId(String storeId) {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof UserAccount user && user.storeId != null && !user.storeId.isBlank()) return user.storeId;
    return storeId == null || storeId.isBlank() ? DEFAULT_STORE_ID : storeId;
  }
  private static String extractDate(String value) {
    if (value == null || value.isBlank()) return LocalDate.now().toString();
    String text = value.trim();
    if (text.length() >= 10) return text.substring(0, 10);
    try { return LocalDate.parse(text, DateTimeFormatter.ISO_DATE).toString(); } catch (Exception ignored) { return LocalDate.now().toString(); }
  }
  private static String empty(String v, String fallback) { return v == null || v.isBlank() ? fallback : v; }
  private static long safe(Long v) { return v == null ? 0L : v; }
  private static int safe(Integer v) { return v == null ? 0 : v; }
}
