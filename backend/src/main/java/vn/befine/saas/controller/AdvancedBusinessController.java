package vn.befine.saas.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.befine.saas.entity.*;
import vn.befine.saas.repository.*;
import vn.befine.saas.util.PublicIdGenerator;
import vn.befine.saas.security.JwtService;
import vn.befine.saas.security.PasswordUtil;
import vn.befine.saas.security.PermissionCatalog;
import vn.befine.saas.service.StaffAccountService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
public class AdvancedBusinessController {
  private static final String DEFAULT_STORE_ID = "store_befine_default";

  private final ProductRepository productRepo;
  private final CustomerRepository customerRepo;
  private final SalesOrderRepository orderRepo;
  private final InventoryLogRepository inventoryRepo;
  private final CashbookRepository cashbookRepo;
  private final SalesChannelRepository channelRepo;
  private final StoreInfoRepository storeInfoRepo;
  private final StaffRepository staffRepo;
  private final UserAccountRepository userRepo;
  private final JwtService jwtService;
  private final StaffAccountService staffAccountService;

  public AdvancedBusinessController(ProductRepository productRepo, CustomerRepository customerRepo,
      SalesOrderRepository orderRepo, InventoryLogRepository inventoryRepo, CashbookRepository cashbookRepo,
      SalesChannelRepository channelRepo, StoreInfoRepository storeInfoRepo, StaffRepository staffRepo,
      UserAccountRepository userRepo, JwtService jwtService, StaffAccountService staffAccountService) {
    this.productRepo = productRepo;
    this.customerRepo = customerRepo;
    this.orderRepo = orderRepo;
    this.inventoryRepo = inventoryRepo;
    this.cashbookRepo = cashbookRepo;
    this.channelRepo = channelRepo;
    this.storeInfoRepo = storeInfoRepo;
    this.staffRepo = staffRepo;
    this.userRepo = userRepo;
    this.jwtService = jwtService;
    this.staffAccountService = staffAccountService;
  }

  @GetMapping("/auth/permissions")
  public ResponseEntity<?> permissions() {
    UserAccount user = currentUserOrThrow();
    String role = PermissionCatalog.normalizeRole(user.role);
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("role", role);
    body.put("storeId", user.storeId);
    body.put("staffId", user.staffId);
    body.put("permissions", PermissionCatalog.effectivePermissions(user));
    return ResponseEntity.ok(body);
  }

  @PostMapping("/auth/refresh")
  public ResponseEntity<?> refreshToken() {
    UserAccount user = currentUserOrThrow();
    return ResponseEntity.ok(Map.of(
        "success", true,
        "tokenType", "Bearer",
        "accessToken", jwtService.generateToken(user),
        "expiresIn", jwtService.getExpirationSeconds(),
        "user", publicUser(user)
    ));
  }

  @PostMapping("/auth/change-password")
  @Transactional
  public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body) {
    UserAccount user = currentUserOrThrow();
    String currentPassword = safeText(body.get("currentPassword"));
    String newPassword = safeText(body.get("newPassword"));
    if (newPassword.length() < 6) return bad("Mật khẩu mới phải có ít nhất 6 ký tự");
    if (!PasswordUtil.matches(currentPassword, user.passwordHash)) return ResponseEntity.status(400).body(Map.of("success", false, "message", "Mật khẩu hiện tại không đúng"));
    user.passwordHash = PasswordUtil.hash(newPassword);
    userRepo.save(user);
    return ResponseEntity.ok(Map.of("success", true, "message", "Đã đổi mật khẩu"));
  }

  @GetMapping("/store")
  public StoreInfo getStore(@RequestHeader(value = "X-Store-Id", required = false) String storeId) {
    String sid = resolveStoreId(storeId);
    return storeInfoRepo.findById(sid).orElseGet(() -> emptyStore(sid));
  }

  @PatchMapping("/store/logo")
  @Transactional
  public ResponseEntity<?> updateStoreLogo(@RequestBody Map<String, String> body) {
    String sid = resolveStoreId(null);
    StoreInfo store = storeInfoRepo.findById(sid).orElseGet(() -> emptyStore(sid));
    store.logo = safeText(body.get("logo"));
    storeInfoRepo.save(store);
    return ResponseEntity.ok(store);
  }

  @GetMapping("/products/search")
  public List<Product> searchProducts(@RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "") String category,
      @RequestParam(defaultValue = "") String status) {
    String sid = resolveStoreId(null);
    String query = safeText(q).toLowerCase();
    String cat = safeText(category).toLowerCase();
    String st = safeText(status).toLowerCase();
    return productRepo.findByStoreId(sid).stream()
        .filter(p -> query.isBlank() || contains(p.name, query) || contains(p.sku, query) || contains(p.barcode, query))
        .filter(p -> cat.isBlank() || contains(p.category, cat))
        .filter(p -> st.isBlank() || contains(p.status, st))
        .toList();
  }

  @PostMapping("/products/bulk")
  @Transactional
  public ResponseEntity<?> bulkProducts(@RequestBody List<Product> products) {
    String sid = resolveStoreId(null);
    int created = 0;
    int updated = 0;
    List<Product> saved = new ArrayList<>();
    for (Product item : Optional.ofNullable(products).orElse(List.of())) {
      if (item == null) continue;
      normalizeProduct(item);
      String requestedId = safeText(item.id);
      if (requestedId.isBlank()) {
        item.id = PublicIdGenerator.next("P", productRepo.findAll(), 3);
        created++;
      } else {
        Optional<Product> existing = productRepo.findById(requestedId);
        if (existing.isPresent() && !Objects.equals(existing.get().storeId, sid)) {
          throw new IllegalArgumentException("Không có quyền cập nhật sản phẩm " + requestedId);
        }
        if (existing.isEmpty()) {
          item.id = PublicIdGenerator.next("P", productRepo.findAll(), 3);
          created++;
        } else {
          item.id = requestedId;
          updated++;
        }
      }
      item.storeId = sid;
      saved.add(productRepo.save(item));
    }
    return ResponseEntity.ok(Map.of("success", true, "created", created, "updated", updated, "items", saved));
  }

  @PatchMapping("/products/{id}/stock")
  @Transactional
  public ResponseEntity<?> updateProductStock(@PathVariable String id, @RequestBody Map<String, Object> body) {
    String sid = resolveStoreId(null);
    return productRepo.findById(id).filter(p -> Objects.equals(p.storeId, sid)).map(p -> {
      int oldStock = safe(p.stock);
      int newStock = body.containsKey("stock") ? intValue(body.get("stock"), oldStock) : oldStock + intValue(body.get("delta"), 0);
      if (newStock < 0) throw new IllegalArgumentException("Tồn kho không được âm");
      if (newStock == oldStock) throw new IllegalArgumentException("Tồn kho không thay đổi");
      p.stock = newStock;
      p.status = stockStatus(p.stock, p.minStock);
      productRepo.save(p);
      InventoryLog log = new InventoryLog();
      log.id = PublicIdGenerator.next("IN", inventoryRepo.findAll(), 3);
      log.storeId = sid;
      log.date = now();
      log.type = newStock >= oldStock ? "import" : "export";
      log.productId = p.id;
      log.product = p.name;
      log.sku = p.sku;
      log.qty = newStock - oldStock;
      log.warehouse = empty(p.warehouse, "Kho chính");
      log.note = empty(String.valueOf(body.getOrDefault("note", "Điều chỉnh tồn kho")), "Điều chỉnh tồn kho");
      log.staff = currentUserOrThrow().fullName;
      inventoryRepo.save(log);
      return ResponseEntity.ok(Map.of("success", true, "product", p, "inventoryLog", log));
    }).orElse(ResponseEntity.notFound().build());
  }

  @PatchMapping("/products/{id}/status")
  @Transactional
  public ResponseEntity<?> updateProductStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
    String sid = resolveStoreId(null);
    return productRepo.findById(id).filter(p -> Objects.equals(p.storeId, sid)).map(p -> {
      p.status = empty(body.get("status"), p.status);
      return ResponseEntity.ok(productRepo.save(p));
    }).orElse(ResponseEntity.notFound().build());
  }

  @GetMapping("/customers/search")
  public List<Customer> searchCustomers(@RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "") String tier) {
    String sid = resolveStoreId(null);
    String query = safeText(q).toLowerCase();
    String t = safeText(tier).toLowerCase();
    return customerRepo.findByStoreId(sid).stream()
        .filter(c -> query.isBlank() || contains(c.name, query) || contains(c.phone, query) || contains(c.email, query))
        .filter(c -> t.isBlank() || contains(c.tier, t))
        .toList();
  }

  @PostMapping("/customers/bulk")
  @Transactional
  public ResponseEntity<?> bulkCustomers(@RequestBody List<Customer> customers) {
    String sid = resolveStoreId(null);
    int created = 0;
    int updated = 0;
    List<Customer> saved = new ArrayList<>();
    for (Customer c : Optional.ofNullable(customers).orElse(List.of())) {
      if (c == null) continue;
      normalizeCustomer(c);
      String requestedId = safeText(c.id);
      if (requestedId.isBlank()) {
        c.id = PublicIdGenerator.next("KH", customerRepo.findAll(), 3);
        created++;
      } else {
        Optional<Customer> existing = customerRepo.findById(requestedId);
        if (existing.isPresent() && !Objects.equals(existing.get().storeId, sid)) {
          throw new IllegalArgumentException("Không có quyền cập nhật khách hàng " + requestedId);
        }
        if (existing.isEmpty()) {
          c.id = PublicIdGenerator.next("KH", customerRepo.findAll(), 3);
          created++;
        } else {
          c.id = requestedId;
          updated++;
        }
      }
      c.storeId = sid;
      saved.add(customerRepo.save(c));
    }
    return ResponseEntity.ok(Map.of("success", true, "created", created, "updated", updated, "items", saved));
  }

  @PatchMapping("/customers/{id}/debt")
  @Transactional
  public ResponseEntity<?> updateCustomerDebt(@PathVariable String id, @RequestBody Map<String, Object> body) {
    String sid = resolveStoreId(null);
    return customerRepo.findById(id).filter(c -> Objects.equals(c.storeId, sid)).map(c -> {
      long debt = body.containsKey("debt") ? longValue(body.get("debt"), safe(c.debt)) : safe(c.debt) + longValue(body.get("delta"), 0L);
      c.debt = Math.max(0, debt);
      return ResponseEntity.ok(customerRepo.save(c));
    }).orElse(ResponseEntity.notFound().build());
  }

  @PatchMapping("/customers/{id}/tier")
  @Transactional
  public ResponseEntity<?> updateCustomerTier(@PathVariable String id, @RequestBody Map<String, String> body) {
    String sid = resolveStoreId(null);
    return customerRepo.findById(id).filter(c -> Objects.equals(c.storeId, sid)).map(c -> {
      c.tier = empty(body.get("tier"), c.tier);
      return ResponseEntity.ok(customerRepo.save(c));
    }).orElse(ResponseEntity.notFound().build());
  }

  @PostMapping("/orders")
  @Transactional
  public ResponseEntity<?> createManualOrder(@RequestBody SalesOrder order) {
    String sid = resolveStoreId(null);
    normalizeOrder(order, sid);
    if ("cancelled".equals(order.status)) throw new IllegalArgumentException("Không thể tạo mới đơn hàng ở trạng thái đã huỷ");
    reserveInventoryForOrder(sid, order);
    SalesOrder saved = orderRepo.save(order);
    updateCustomerAfterOrder(sid, saved);
    updateChannelAfterOrder(sid, saved, 1);
    writeCashbookForOrder(sid, saved);
    return ResponseEntity.ok(saved);
  }

  @PutMapping("/orders/{id}")
  @Transactional
  public ResponseEntity<?> updateOrder(@PathVariable String id, @RequestBody SalesOrder payload) {
    String sid = resolveStoreId(null);
    return orderRepo.findById(id).filter(o -> Objects.equals(o.storeId, sid)).map(old -> {
      payload.id = id;
      payload.storeId = sid;
      payload.date = old.date;
      payload.customer = old.customer;
      payload.phone = old.phone;
      payload.total = old.total;
      payload.discount = old.discount;
      payload.paid = old.paid;
      payload.channel = old.channel;
      payload.items = old.items;
      payload.shippingFee = old.shippingFee;
      if (payload.email == null) payload.email = old.email;
      if (payload.shippingAddress == null) payload.shippingAddress = old.shippingAddress;
      if (payload.sourceUrl == null) payload.sourceUrl = old.sourceUrl;
      if (payload.note == null) payload.note = old.note;
      // Trạng thái chỉ được đổi qua endpoint chuyên dụng để không bỏ qua logic hoàn tồn khi huỷ.
      payload.status = old.status;
      if (payload.payment == null) payload.payment = old.payment;
      if (payload.staff == null) payload.staff = old.staff;
      return ResponseEntity.ok(orderRepo.save(payload));
    }).orElse(ResponseEntity.notFound().build());
  }

  @DeleteMapping("/orders/{id}")
  @Transactional
  public ResponseEntity<?> deleteOrder(@PathVariable String id) {
    String sid = resolveStoreId(null);
    return orderRepo.findById(id).filter(o -> Objects.equals(o.storeId, sid)).map(order -> {
      if (!"cancelled".equalsIgnoreCase(order.status)) {
        restoreInventoryForDeletedOrder(sid, order);
        rollbackCustomerAfterOrder(sid, order);
        updateChannelAfterOrder(sid, order, -1);
      }
      cashbookRepo.findByStoreId(sid).stream()
          .filter(entry -> Objects.equals(entry.ref, order.id))
          .forEach(cashbookRepo::delete);
      orderRepo.delete(order);
      return ResponseEntity.ok(Map.of("success", true, "deleted", id));
    }).orElse(ResponseEntity.notFound().build());
  }

  @PatchMapping("/orders/{id}/payment")
  @Transactional
  public ResponseEntity<?> updateOrderPayment(@PathVariable String id, @RequestBody Map<String, Object> body) {
    String sid = resolveStoreId(null);
    return orderRepo.findById(id).filter(o -> Objects.equals(o.storeId, sid)).map(o -> {
      if ("cancelled".equalsIgnoreCase(o.status)) throw new IllegalArgumentException("Không thể cập nhật thanh toán cho đơn đã huỷ");
      long oldPaid = safe(o.paid);
      long requestedPaid = longValue(body.get("paid"), oldPaid);
      o.paid = Math.max(0L, Math.min(safe(o.total), requestedPaid));
      o.payment = empty(String.valueOf(body.getOrDefault("payment", o.payment)), o.payment);
      if (o.paid >= safe(o.total)) o.status = "completed";
      else if ("completed".equalsIgnoreCase(o.status)) o.status = "processing";
      orderRepo.save(o);
      long delta = o.paid - oldPaid;
      if (delta != 0) {
        boolean receipt = delta > 0;
        CashbookEntry entry = new CashbookEntry();
        entry.id = PublicIdGenerator.next(receipt ? "PT" : "PC", cashbookRepo.findAll(), 3);
        entry.storeId = sid;
        entry.date = now();
        entry.type = receipt ? "receipt" : "payment";
        entry.category = receipt ? "Thu công nợ đơn hàng" : "Hoàn/giảm thanh toán đơn hàng";
        entry.amount = Math.abs(delta);
        entry.method = empty(o.payment, "Tiền mặt");
        entry.ref = o.id;
        entry.staff = currentUserOrThrow().fullName;
        cashbookRepo.save(entry);
      }
      return ResponseEntity.ok(o);
    }).orElse(ResponseEntity.notFound().build());
  }

  @GetMapping("/inventory/low-stock")
  public List<Product> lowStock() {
    String sid = resolveStoreId(null);
    return productRepo.findByStoreId(sid).stream().filter(p -> safe(p.stock) <= safe(p.minStock)).toList();
  }

  @PutMapping("/inventory/logs/{id}")
  public ResponseEntity<?> updateInventoryLog(@PathVariable String id, @RequestBody InventoryLog payload) {
    String sid = resolveStoreId(null);
    return inventoryRepo.findById(id).filter(l -> Objects.equals(l.storeId, sid)).map(old -> {
      payload.id = id;
      payload.storeId = sid;
      if (payload.date == null) payload.date = old.date;
      return ResponseEntity.ok(inventoryRepo.save(payload));
    }).orElse(ResponseEntity.notFound().build());
  }

  @DeleteMapping("/inventory/logs/{id}")
  public ResponseEntity<?> deleteInventoryLog(@PathVariable String id) {
    String sid = resolveStoreId(null);
    return inventoryRepo.findById(id).filter(l -> Objects.equals(l.storeId, sid)).map(log -> {
      inventoryRepo.delete(log);
      return ResponseEntity.ok(Map.of("success", true, "deleted", id));
    }).orElse(ResponseEntity.notFound().build());
  }

  @PostMapping("/inventory/transfer")
  @Transactional
  public ResponseEntity<?> transferWarehouse(@RequestBody Map<String, Object> body) {
    String sid = resolveStoreId(null);
    String productId = safeText(String.valueOf(body.get("productId")));
    int qty = intValue(body.get("qty"), 0);
    if (qty <= 0) return bad("Số lượng chuyển kho phải lớn hơn 0");
    String fromWarehouse = safeText(String.valueOf(body.getOrDefault("fromWarehouse", "Kho xuất")));
    String toWarehouse = safeText(String.valueOf(body.getOrDefault("toWarehouse", "Kho nhập")));
    return productRepo.findById(productId).filter(p -> Objects.equals(p.storeId, sid)).map(p -> {
      if (safe(p.stock) < qty) throw new IllegalArgumentException("Không đủ tồn kho để chuyển");
      InventoryLog out = buildInventoryLog(sid, p, -qty, fromWarehouse, "Chuyển kho sang " + toWarehouse);
      InventoryLog in = buildInventoryLog(sid, p, qty, toWarehouse, "Nhận chuyển kho từ " + fromWarehouse);
      inventoryRepo.save(out);
      inventoryRepo.save(in);
      return ResponseEntity.ok(Map.of("success", true, "exportLog", out, "importLog", in));
    }).orElse(ResponseEntity.notFound().build());
  }

  @PatchMapping("/staff/{id}/role")
  @Transactional
  public ResponseEntity<?> updateStaffRole(@PathVariable String id, @RequestBody Map<String, String> body) {
    String sid = resolveStoreId(null);
    Staff staff = staffRepo.findById(id).filter(s -> Objects.equals(s.storeId, sid))
        .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên"));
    String systemRole = PermissionCatalog.normalizeRole(body.getOrDefault("systemRole", staff.systemRole));
    staff.role = empty(body.get("role"), staff.role);
    staff.status = empty(body.get("status"), staff.status);
    staff.systemRole = systemRole;
    staff.permissions = new ArrayList<>(PermissionCatalog.defaultsForRole(systemRole));
    if (body.containsKey("accountStatus")) staff.accountStatus = empty(body.get("accountStatus"), staff.accountStatus);
    return ResponseEntity.ok(staffAccountService.update(sid, id, staff, currentUserOrThrow()));
  }

  private void reserveInventoryForOrder(String sid, SalesOrder order) {
    if (order.items == null || order.items.isEmpty()) throw new IllegalArgumentException("Đơn hàng cần ít nhất một sản phẩm");
    Set<String> seen = new HashSet<>();
    long subtotal = 0L;
    Map<String, Product> products = new LinkedHashMap<>();
    for (OrderItem item : order.items) {
      String productId = safeText(item == null ? null : item.productId);
      int qty = item == null ? 0 : safe(item.qty);
      if (productId.isBlank() || qty <= 0) throw new IllegalArgumentException("Dòng sản phẩm trong đơn không hợp lệ");
      if (!seen.add(productId)) throw new IllegalArgumentException("Một sản phẩm không được xuất hiện nhiều lần trong cùng đơn hàng");
      Product product = productRepo.findById(productId).filter(p -> Objects.equals(p.storeId, sid))
          .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm " + productId));
      if (safe(product.stock) < qty) throw new IllegalArgumentException("Không đủ tồn kho: " + product.name);
      long price = item.price == null ? safe(product.price) : item.price;
      if (price < 0 || price > Long.MAX_VALUE / qty) throw new IllegalArgumentException("Đơn giá sản phẩm không hợp lệ");
      long amount = price * qty;
      if (subtotal > Long.MAX_VALUE - amount) throw new IllegalArgumentException("Tổng giá trị đơn hàng vượt giới hạn cho phép");
      subtotal += amount;
      item.name = product.name;
      item.price = price;
      products.put(productId, product);
    }
    order.discount = Math.max(0L, Math.min(subtotal, safe(order.discount)));
    order.shippingFee = Math.max(0L, safe(order.shippingFee));
    long net = subtotal - order.discount;
    if (order.shippingFee > Long.MAX_VALUE - net) throw new IllegalArgumentException("Tổng giá trị đơn hàng vượt giới hạn cho phép");
    order.total = net + order.shippingFee;
    order.paid = Math.max(0L, Math.min(order.total, safe(order.paid)));
    if (!validOrderStatus(order.status)) {
      order.status = order.paid >= order.total ? "completed" : "processing";
    } else {
      order.status = order.status.toLowerCase();
    }
    for (OrderItem item : order.items) {
      Product product = products.get(item.productId);
      product.stock = safe(product.stock) - safe(item.qty);
      product.status = stockStatus(product.stock, product.minStock);
      productRepo.save(product);
      inventoryRepo.save(buildInventoryLog(sid, product, -safe(item.qty), empty(product.warehouse, "Kho chính"), "Xuất bán đơn " + order.id));
    }
  }

  private void restoreInventoryForDeletedOrder(String sid, SalesOrder order) {
    if (order.items == null) return;
    for (OrderItem item : order.items) {
      if (item == null || safe(item.qty) <= 0) continue;
      productRepo.findById(item.productId).filter(p -> Objects.equals(p.storeId, sid)).ifPresent(product -> {
        product.stock = safe(product.stock) + safe(item.qty);
        product.status = stockStatus(product.stock, product.minStock);
        productRepo.save(product);
        inventoryRepo.save(buildInventoryLog(sid, product, safe(item.qty), empty(product.warehouse, "Kho chính"), "Hoàn tồn khi xoá đơn " + order.id));
      });
    }
  }

  private void rollbackCustomerAfterOrder(String sid, SalesOrder order) {
    if (order.customer == null || "Khách lẻ".equalsIgnoreCase(order.customer)) return;
    customerRepo.findByStoreId(sid).stream()
        .filter(c -> Objects.equals(c.name, order.customer) || (!empty(order.phone, "").isBlank() && Objects.equals(c.phone, order.phone)))
        .findFirst()
        .ifPresent(customer -> {
          customer.totalOrders = Math.max(0, safe(customer.totalOrders) - 1);
          customer.totalSpent = Math.max(0L, safe(customer.totalSpent) - safe(order.total));
          customerRepo.save(customer);
        });
  }

  private void updateChannelAfterOrder(String sid, SalesOrder order, int direction) {
    channelRepo.findByStoreId(sid).stream().filter(channel -> Objects.equals(channel.name, order.channel)).findFirst().ifPresent(channel -> {
      channel.orders = Math.max(0, safe(channel.orders) + direction);
      channel.revenue = Math.max(0L, safe(channel.revenue) + direction * safe(order.total));
      channel.sync = "Vừa cập nhật";
      channelRepo.save(channel);
    });
  }

  private InventoryLog buildInventoryLog(String sid, Product p, int qty, String warehouse, String note) {
    InventoryLog log = new InventoryLog();
    log.id = PublicIdGenerator.next("IN", inventoryRepo.findAll(), 3);
    log.storeId = sid;
    log.date = now();
    log.type = qty < 0 ? "export" : "import";
    log.productId = p.id;
    log.product = p.name;
    log.sku = p.sku;
    log.qty = qty;
    log.warehouse = warehouse;
    log.note = note;
    log.staff = currentUserOrThrow().fullName;
    return log;
  }

  private void normalizeOrder(SalesOrder order, String sid) {
    if (order.id == null || order.id.isBlank()) order.id = PublicIdGenerator.next("ĐH", orderRepo.findAll(), 6, 1233);
    order.storeId = sid;
    if (order.date == null) order.date = now();
    if (!validOrderStatus(order.status)) order.status = null;
    else order.status = order.status.toLowerCase();
    if (order.customer == null) order.customer = "Khách lẻ";
    if (order.payment == null) order.payment = "Tiền mặt";
    if (order.channel == null) order.channel = "POS cửa hàng";
    if (order.staff == null) order.staff = currentUserOrThrow().fullName;
    if (order.items == null) order.items = new ArrayList<>();
  }

  private void updateCustomerAfterOrder(String sid, SalesOrder order) {
    if (order.customer == null || "Khách lẻ".equalsIgnoreCase(order.customer)) return;
    Optional<Customer> found = customerRepo.findByStoreId(sid).stream()
        .filter(c -> Objects.equals(c.name, order.customer) || (!empty(order.phone, "").isBlank() && Objects.equals(c.phone, order.phone)))
        .findFirst();
    Customer c = found.orElseGet(() -> {
      Customer created = new Customer();
      created.id = PublicIdGenerator.next("KH", customerRepo.findAll(), 3);
      created.storeId = sid;
      created.name = order.customer;
      created.phone = empty(order.phone, "");
      created.email = empty(order.email, "");
      created.address = empty(order.shippingAddress, "");
      created.tier = "new";
      created.debt = 0L;
      created.totalOrders = 0;
      created.totalSpent = 0L;
      created.joinDate = LocalDate.now().toString();
      created.tags = new ArrayList<>();
      return created;
    });
    if (safeText(c.phone).isBlank()) c.phone = empty(order.phone, "");
    if (safeText(c.email).isBlank()) c.email = empty(order.email, "");
    if (safeText(c.address).isBlank()) c.address = empty(order.shippingAddress, "");
    c.totalOrders = safe(c.totalOrders) + 1;
    c.totalSpent = safe(c.totalSpent) + safe(order.total);
    c.lastOrder = LocalDate.now().toString();
    c.source = empty(c.source, empty(order.channel, "POS cửa hàng"));
    if (c.tags == null) c.tags = new ArrayList<>();
    if (!c.tags.contains(c.source)) c.tags.add(c.source);
    customerRepo.save(c);
  }

  private void writeCashbookForOrder(String sid, SalesOrder order) {
    if (safe(order.paid) <= 0) return;
    CashbookEntry entry = new CashbookEntry();
    entry.id = PublicIdGenerator.next("PT", cashbookRepo.findAll(), 3);
    entry.storeId = sid;
    entry.date = now();
    entry.type = "receipt";
    entry.category = "Thu bán hàng";
    entry.amount = safe(order.paid);
    entry.method = empty(order.payment, "Tiền mặt");
    entry.ref = order.id;
    entry.staff = empty(order.staff, currentUserOrThrow().fullName);
    cashbookRepo.save(entry);
  }

  private void normalizeProduct(Product p) {
    p.name = safeText(p.name);
    if (p.name.isBlank()) throw new IllegalArgumentException("Tên sản phẩm không được để trống");
    p.price = Math.max(0, safe(p.price));
    p.compareAtPrice = Math.max(0, safe(p.compareAtPrice));
    p.cost = Math.max(0, safe(p.cost));
    p.stock = Math.max(0, safe(p.stock));
    p.minStock = Math.max(0, safe(p.minStock));
    p.weight = Math.max(0, safe(p.weight));
    p.taxRate = p.taxRate == null ? 0D : Math.max(0D, Math.min(100D, p.taxRate));
    p.status = stockStatus(p.stock, p.minStock);
    if (p.channel == null) p.channel = new ArrayList<>();
    if (p.tags == null) p.tags = new ArrayList<>();
  }

  private void normalizeCustomer(Customer c) {
    if (c.totalOrders == null) c.totalOrders = 0;
    if (c.totalSpent == null) c.totalSpent = 0L;
    if (c.debt == null) c.debt = 0L;
    if (c.tier == null) c.tier = "new";
    if (c.joinDate == null) c.joinDate = LocalDate.now().toString();
    c.source = empty(c.source, "POS cửa hàng");
    if (c.tags == null) c.tags = new ArrayList<>();
  }

  private StoreInfo emptyStore(String sid) {
    StoreInfo s = new StoreInfo();
    s.id = sid;
    s.name = "Cửa hàng của bạn";
    s.plan = "BefineSaaS";
    s.currency = "VND";
    return s;
  }

  private UserAccount currentUserOrThrow() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof UserAccount user) return user;
    throw new IllegalArgumentException("Vui lòng đăng nhập lại");
  }

  private String resolveStoreId(String storeId) {
    UserAccount user = currentUserOrThrow();
    if (user.storeId != null && !user.storeId.isBlank()) return user.storeId;
    return storeId == null || storeId.isBlank() ? DEFAULT_STORE_ID : storeId;
  }

  private Map<String, Object> publicUser(UserAccount u) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", u.id == null ? null : "user_" + u.id);
    m.put("email", u.email);
    m.put("fullName", u.fullName);
    m.put("phone", u.phone);
    m.put("role", PermissionCatalog.normalizeRole(u.role));
    m.put("permissions", PermissionCatalog.effectivePermissions(u));
    m.put("staffId", u.staffId);
    m.put("status", empty(u.status, "active"));
    m.put("lastLoginAt", u.lastLoginAt);
    m.put("storeId", u.storeId == null ? DEFAULT_STORE_ID : u.storeId);
    m.put("storeName", u.storeName);
    m.put("storeType", u.storeType);
    m.put("plan", empty(u.plan, "BefineSaaS"));
    m.put("avatar", u.avatar);
    m.put("avatarInitials", initials(u.fullName));
    m.put("createdAt", u.createdAt);
    return m;
  }

  private Set<String> permissionsFor(String role) {
    return PermissionCatalog.defaultsForRole(role);
  }

  private static ResponseEntity<?> bad(String message) { return ResponseEntity.badRequest().body(Map.of("success", false, "message", message)); }
  private static String normalizeRole(String role) {
    return PermissionCatalog.normalizeRole(role);
  }

  private static boolean validOrderStatus(String status) {
    return Set.of("processing", "shipping", "completed", "cancelled").contains(safeText(status).toLowerCase());
  }
  private static boolean contains(String value, String query) { return value != null && value.toLowerCase().contains(query); }
  private static String now() { return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")); }
  private static String stockStatus(Integer stock, Integer minStock) { int s = safe(stock), m = safe(minStock); return s <= 0 ? "out_of_stock" : s <= m ? "low_stock" : "active"; }
  private static int safe(Integer v) { return v == null ? 0 : v; }
  private static long safe(Long v) { return v == null ? 0L : v; }
  private static String empty(String v, String fallback) { return v == null || v.isBlank() ? fallback : v; }
  private static String safeText(String v) { return v == null || "null".equalsIgnoreCase(v) ? "" : v.trim(); }
  private static int intValue(Object value, int fallback) { try { return Integer.parseInt(String.valueOf(value)); } catch (Exception e) { return fallback; } }
  private static long longValue(Object value, long fallback) { try { return Long.parseLong(String.valueOf(value)); } catch (Exception e) { return fallback; } }
  private static String initials(String fullName) {
    if (fullName == null || fullName.isBlank()) return "U";
    String[] parts = fullName.trim().split("\\s+");
    if (parts.length == 1) return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
    return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
  }
}
