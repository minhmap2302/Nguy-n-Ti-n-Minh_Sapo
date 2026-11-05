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
public class AdvancedReportsController {
  private static final String DEFAULT_STORE_ID = "store_befine_default";
  private final ProductRepository productRepo;
  private final CustomerRepository customerRepo;
  private final SalesOrderRepository orderRepo;
  private final CashbookRepository cashbookRepo;
  private final InventoryLogRepository inventoryRepo;

  public AdvancedReportsController(ProductRepository productRepo, CustomerRepository customerRepo, SalesOrderRepository orderRepo,
      CashbookRepository cashbookRepo, InventoryLogRepository inventoryRepo) {
    this.productRepo = productRepo;
    this.customerRepo = customerRepo;
    this.orderRepo = orderRepo;
    this.cashbookRepo = cashbookRepo;
    this.inventoryRepo = inventoryRepo;
  }

  @GetMapping("/dashboard-full")
  public Map<String, Object> dashboardFull(@RequestParam(defaultValue = "30") int days) {
    String sid = resolveStoreId(null);
    Map<String, Object> map = new LinkedHashMap<>();
    map.put("summary", buildSummary(sid));
    map.put("dailyRevenue", dailyRevenueRows(sid, days));
    map.put("monthlyRevenue", monthlyRevenueRows(sid, 12));
    map.put("topProducts", topProductsRows(sid, 10));
    map.put("staffPerformance", staffPerformanceRows(sid));
    map.put("channelPerformance", channelPerformanceRows(sid));
    map.put("customerSegments", customerSegmentsRows(sid));
    map.put("cashflow", cashflowRows(sid, days));
    map.put("inventoryRisk", inventoryRiskRows(sid));
    return map;
  }

  @GetMapping("/monthly-revenue")
  public List<Map<String, Object>> monthlyRevenue(@RequestParam(defaultValue = "12") int months) {
    return monthlyRevenueRows(resolveStoreId(null), Math.max(1, Math.min(months, 36)));
  }

  @GetMapping("/staff-performance")
  public List<Map<String, Object>> staffPerformance() {
    return staffPerformanceRows(resolveStoreId(null));
  }

  @GetMapping("/channel-performance")
  public List<Map<String, Object>> channelPerformance() {
    return channelPerformanceRows(resolveStoreId(null));
  }

  @GetMapping("/customer-segments")
  public List<Map<String, Object>> customerSegments() {
    return customerSegmentsRows(resolveStoreId(null));
  }

  @GetMapping("/cashflow")
  public List<Map<String, Object>> cashflow(@RequestParam(defaultValue = "30") int days) {
    return cashflowRows(resolveStoreId(null), Math.max(1, Math.min(days, 180)));
  }

  @GetMapping("/profit")
  public Map<String, Object> profit() {
    String sid = resolveStoreId(null);
    List<SalesOrder> orders = completedOrders(sid);
    Map<String, Product> products = productRepo.findByStoreId(sid).stream().collect(Collectors.toMap(p -> p.id, p -> p, (a, b) -> a));
    long revenue = 0;
    long cost = 0;
    long qty = 0;
    for (SalesOrder o : orders) {
      revenue += safe(o.total);
      if (o.items == null) continue;
      for (OrderItem item : o.items) {
        Product p = products.get(item.productId);
        qty += safe(item.qty);
        cost += (p == null ? 0 : safe(p.cost)) * safe(item.qty);
      }
    }
    long grossProfit = revenue - cost;
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("revenue", revenue);
    result.put("cost", cost);
    result.put("grossProfit", grossProfit);
    result.put("grossMarginPercent", revenue == 0 ? 0 : Math.round(grossProfit * 10000.0 / revenue) / 100.0);
    result.put("soldQty", qty);
    result.put("completedOrders", orders.size());
    return result;
  }

  private Map<String, Object> buildSummary(String sid) {
    List<SalesOrder> orders = orderRepo.findByStoreId(sid);
    List<Product> products = productRepo.findByStoreId(sid);
    List<Customer> customers = customerRepo.findByStoreId(sid);
    List<CashbookEntry> cashbook = cashbookRepo.findByStoreId(sid);
    long revenue = orders.stream().filter(this::isCompleted).mapToLong(o -> safe(o.total)).sum();
    long websiteRevenue = orders.stream().filter(o -> isCompleted(o) && "Website Befine.vn".equalsIgnoreCase(empty(o.channel, ""))).mapToLong(o -> safe(o.total)).sum();
    long websiteOrders = orders.stream().filter(o -> "Website Befine.vn".equalsIgnoreCase(empty(o.channel, ""))).count();
    long receipts = cashbook.stream().filter(c -> "receipt".equalsIgnoreCase(empty(c.type, ""))).mapToLong(c -> safe(c.amount)).sum();
    long payments = cashbook.stream().filter(c -> "payment".equalsIgnoreCase(empty(c.type, ""))).mapToLong(c -> safe(c.amount)).sum();
    long stockValue = products.stream().mapToLong(p -> safe(p.stock) * safe(p.cost)).sum();
    long potentialRevenue = products.stream().mapToLong(p -> safe(p.stock) * safe(p.price)).sum();
    Map<String, Object> map = new LinkedHashMap<>();
    map.put("revenue", revenue);
    map.put("orders", orders.size());
    map.put("completedOrders", orders.stream().filter(this::isCompleted).count());
    map.put("processingOrders", orders.stream().filter(o -> Set.of("processing", "shipping", "pending").contains(empty(o.status, "").toLowerCase())).count());
    map.put("customers", customers.size());
    map.put("products", products.size());
    map.put("lowStock", products.stream().filter(p -> safe(p.stock) <= safe(p.minStock)).count());
    map.put("outOfStock", products.stream().filter(p -> safe(p.stock) <= 0).count());
    map.put("stockValue", stockValue);
    map.put("potentialRevenue", potentialRevenue);
    map.put("cashBalance", receipts - payments);
    map.put("websiteRevenue", websiteRevenue);
    map.put("websiteOrders", websiteOrders);
    return map;
  }

  private List<Map<String, Object>> dailyRevenueRows(String sid, int days) {
    int safeDays = Math.max(1, Math.min(days, 180));
    LocalDate today = LocalDate.now();
    Map<String, List<SalesOrder>> grouped = completedOrders(sid).stream().collect(Collectors.groupingBy(o -> dateKey(o.date)));
    List<Map<String, Object>> rows = new ArrayList<>();
    for (int i = safeDays - 1; i >= 0; i--) {
      String date = today.minusDays(i).toString();
      List<SalesOrder> list = grouped.getOrDefault(date, List.of());
      rows.add(row("date", date, "revenue", list.stream().mapToLong(o -> safe(o.total)).sum(), "orders", list.size()));
    }
    return rows;
  }

  private List<Map<String, Object>> monthlyRevenueRows(String sid, int months) {
    LocalDate today = LocalDate.now().withDayOfMonth(1);
    Map<String, List<SalesOrder>> grouped = completedOrders(sid).stream().collect(Collectors.groupingBy(o -> monthKey(o.date)));
    List<Map<String, Object>> rows = new ArrayList<>();
    for (int i = months - 1; i >= 0; i--) {
      String month = today.minusMonths(i).toString().substring(0, 7);
      List<SalesOrder> list = grouped.getOrDefault(month, List.of());
      rows.add(row("month", month, "revenue", list.stream().mapToLong(o -> safe(o.total)).sum(), "orders", list.size()));
    }
    return rows;
  }

  private List<Map<String, Object>> topProductsRows(String sid, int limit) {
    Map<String, Product> productMap = productRepo.findByStoreId(sid).stream().collect(Collectors.toMap(p -> p.id, p -> p, (a, b) -> a));
    Map<String, long[]> stats = new LinkedHashMap<>();
    for (SalesOrder order : completedOrders(sid)) {
      if (order.items == null) continue;
      for (OrderItem item : order.items) {
        String key = empty(item.productId, item.name);
        long[] arr = stats.computeIfAbsent(key, k -> new long[3]);
        arr[0] += safe(item.qty);
        arr[1] += safe(item.qty) * safe(item.price);
        Product p = productMap.get(key);
        arr[2] += (p == null ? 0 : safe(p.cost)) * safe(item.qty);
      }
    }
    return stats.entrySet().stream().sorted((a, b) -> Long.compare(b.getValue()[1], a.getValue()[1])).limit(limit).map(e -> {
      Product p = productMap.get(e.getKey());
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("productId", e.getKey());
      m.put("name", p == null ? e.getKey() : p.name);
      m.put("sku", p == null ? "" : p.sku);
      m.put("qty", e.getValue()[0]);
      m.put("revenue", e.getValue()[1]);
      m.put("grossProfit", e.getValue()[1] - e.getValue()[2]);
      return m;
    }).toList();
  }

  private List<Map<String, Object>> staffPerformanceRows(String sid) {
    return completedOrders(sid).stream().collect(Collectors.groupingBy(o -> empty(o.staff, "Chưa gán"))).entrySet().stream()
        .map(e -> row("staff", e.getKey(), "orders", e.getValue().size(), "revenue", e.getValue().stream().mapToLong(o -> safe(o.total)).sum()))
        .sorted((a, b) -> Long.compare(((Number)b.get("revenue")).longValue(), ((Number)a.get("revenue")).longValue()))
        .toList();
  }

  private List<Map<String, Object>> channelPerformanceRows(String sid) {
    return completedOrders(sid).stream().collect(Collectors.groupingBy(o -> empty(o.channel, "Khác"))).entrySet().stream()
        .map(e -> row("channel", e.getKey(), "orders", e.getValue().size(), "revenue", e.getValue().stream().mapToLong(o -> safe(o.total)).sum()))
        .sorted((a, b) -> Long.compare(((Number)b.get("revenue")).longValue(), ((Number)a.get("revenue")).longValue()))
        .toList();
  }

  private List<Map<String, Object>> customerSegmentsRows(String sid) {
    return customerRepo.findByStoreId(sid).stream().collect(Collectors.groupingBy(c -> empty(c.tier, "new"))).entrySet().stream()
        .map(e -> row("tier", e.getKey(), "customers", e.getValue().size(), "spent", e.getValue().stream().mapToLong(c -> safe(c.totalSpent)).sum(), "debt", e.getValue().stream().mapToLong(c -> safe(c.debt)).sum()))
        .toList();
  }

  private List<Map<String, Object>> cashflowRows(String sid, int days) {
    int safeDays = Math.max(1, Math.min(days, 180));
    LocalDate today = LocalDate.now();
    Map<String, List<CashbookEntry>> grouped = cashbookRepo.findByStoreId(sid).stream().collect(Collectors.groupingBy(c -> dateKey(c.date)));
    List<Map<String, Object>> rows = new ArrayList<>();
    for (int i = safeDays - 1; i >= 0; i--) {
      String date = today.minusDays(i).toString();
      List<CashbookEntry> list = grouped.getOrDefault(date, List.of());
      long receipts = list.stream().filter(c -> "receipt".equalsIgnoreCase(empty(c.type, ""))).mapToLong(c -> safe(c.amount)).sum();
      long payments = list.stream().filter(c -> "payment".equalsIgnoreCase(empty(c.type, ""))).mapToLong(c -> safe(c.amount)).sum();
      rows.add(row("date", date, "receipts", receipts, "payments", payments, "balance", receipts - payments));
    }
    return rows;
  }

  private List<Map<String, Object>> inventoryRiskRows(String sid) {
    Map<String, Long> exported = inventoryRepo.findByStoreId(sid).stream()
        .filter(l -> "export".equalsIgnoreCase(empty(l.type, "")))
        .collect(Collectors.groupingBy(l -> empty(l.productId, l.product), Collectors.summingLong(l -> Math.abs(safe(l.qty)))));
    return productRepo.findByStoreId(sid).stream().map(p -> {
      long sold = exported.getOrDefault(p.id, 0L);
      int available = safe(p.stock);
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("productId", p.id);
      m.put("name", p.name);
      m.put("sku", p.sku);
      m.put("stock", available);
      m.put("minStock", safe(p.minStock));
      m.put("soldQty", sold);
      m.put("risk", available <= 0 ? "out_of_stock" : available <= safe(p.minStock) ? "low_stock" : sold > available * 2L ? "fast_moving" : "normal");
      return m;
    }).sorted(Comparator.comparing(m -> String.valueOf(m.get("risk")))).toList();
  }

  private List<SalesOrder> completedOrders(String sid) { return orderRepo.findByStoreId(sid).stream().filter(this::isCompleted).toList(); }
  private boolean isCompleted(SalesOrder o) { return "completed".equalsIgnoreCase(empty(o.status, "")); }
  private String resolveStoreId(String storeId) {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof UserAccount user && user.storeId != null && !user.storeId.isBlank()) return user.storeId;
    return storeId == null || storeId.isBlank() ? DEFAULT_STORE_ID : storeId;
  }
  private static Map<String, Object> row(Object... kv) {
    Map<String, Object> m = new LinkedHashMap<>();
    for (int i = 0; i + 1 < kv.length; i += 2) m.put(String.valueOf(kv[i]), kv[i + 1]);
    return m;
  }
  private static String dateKey(String value) {
    if (value == null || value.isBlank()) return LocalDate.now().toString();
    String text = value.trim();
    if (text.length() >= 10) return text.substring(0, 10);
    try { return LocalDate.parse(text, DateTimeFormatter.ISO_DATE).toString(); } catch (Exception ignored) { return LocalDate.now().toString(); }
  }
  private static String monthKey(String value) { return dateKey(value).substring(0, 7); }
  private static String empty(String v, String fallback) { return v == null || v.isBlank() ? fallback : v; }
  private static long safe(Long v) { return v == null ? 0L : v; }
  private static int safe(Integer v) { return v == null ? 0 : v; }
}
