package vn.befine.saas.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.befine.saas.dto.CheckoutRequest;
import vn.befine.saas.dto.LoginRequest;
import vn.befine.saas.dto.RegisterRequest;
import vn.befine.saas.security.JwtService;
import jakarta.validation.Valid;
import vn.befine.saas.entity.*;
import vn.befine.saas.repository.*;
import vn.befine.saas.service.StaffAccountService;
import vn.befine.saas.security.PermissionCatalog;
import vn.befine.saas.security.PasswordUtil;
import vn.befine.saas.util.PublicIdGenerator;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
public class BefineSaaSController {
  private static final String DEFAULT_STORE_ID = "store_befine_default";

  private final StoreInfoRepository storeInfoRepo;
  private final WarehouseRepository warehouseRepo;
  private final ProductRepository productRepo;
  private final CustomerRepository customerRepo;
  private final StaffRepository staffRepo;
  private final SupplierRepository supplierRepo;
  private final SalesChannelRepository channelRepo;
  private final SalesOrderRepository orderRepo;
  private final InventoryLogRepository inventoryRepo;
  private final PurchaseOrderRepository purchaseRepo;
  private final ReturnOrderRepository returnRepo;
  private final PromotionRepository promotionRepo;
  private final CashbookRepository cashbookRepo;
  private final UserAccountRepository userRepo;
  private final StaffAccountService staffAccountService;
  private final JwtService jwtService;
  private final String uploadDir;

  public BefineSaaSController(StoreInfoRepository storeInfoRepo, WarehouseRepository warehouseRepo, ProductRepository productRepo,
      CustomerRepository customerRepo, StaffRepository staffRepo, SupplierRepository supplierRepo,
      SalesChannelRepository channelRepo, SalesOrderRepository orderRepo, InventoryLogRepository inventoryRepo,
      PurchaseOrderRepository purchaseRepo, ReturnOrderRepository returnRepo, PromotionRepository promotionRepo,
      CashbookRepository cashbookRepo, UserAccountRepository userRepo, StaffAccountService staffAccountService, JwtService jwtService, @Value("${app.upload-dir:./uploads}") String uploadDir) {
    this.storeInfoRepo = storeInfoRepo;
    this.warehouseRepo = warehouseRepo;
    this.productRepo = productRepo;
    this.customerRepo = customerRepo;
    this.staffRepo = staffRepo;
    this.supplierRepo = supplierRepo;
    this.channelRepo = channelRepo;
    this.orderRepo = orderRepo;
    this.inventoryRepo = inventoryRepo;
    this.purchaseRepo = purchaseRepo;
    this.returnRepo = returnRepo;
    this.promotionRepo = promotionRepo;
    this.cashbookRepo = cashbookRepo;
    this.userRepo = userRepo;
    this.staffAccountService = staffAccountService;
    this.jwtService = jwtService;
    this.uploadDir = uploadDir;
  }

  @PostMapping("/auth/login")
  public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
    String email = safeText(request.email).toLowerCase();
    return userRepo.findByEmail(email)
        .filter(u -> "active".equalsIgnoreCase(empty(u.status, "active")))
        .filter(u -> PasswordUtil.matches(request.password, u.passwordHash))
        .<ResponseEntity<?>>map(u -> {
          u.lastLoginAt = now();
          userRepo.save(u);
          String token = jwtService.generateToken(u);
          return ResponseEntity.ok(Map.of(
              "success", true,
              "tokenType", "Bearer",
              "accessToken", token,
              "expiresIn", jwtService.getExpirationSeconds(),
              "user", publicUser(u)
          ));
        })
        .orElse(ResponseEntity.status(401).body(Map.of("success", false, "message", "Email hoặc mật khẩu không đúng")));
  }

  @PostMapping("/auth/register")
  @Transactional
  public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
    String email = safeText(request.email).toLowerCase();
    if (userRepo.findByEmail(email).isPresent()) {
      return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email này đã được đăng ký"));
    }

    String storeId = "store_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    UserAccount user = new UserAccount();
    user.email = email;
    user.passwordHash = PasswordUtil.hash(request.password);
    user.fullName = request.fullName;
    user.phone = request.phone;
    user.storeId = storeId;
    user.storeName = request.storeName;
    user.storeType = empty(request.storeType, "retail");
    user.plan = empty(request.plan, "BefineSaaS");
    user.avatarInitials = initials(user.fullName);
    user.role = "OWNER";
    user.permissions = new LinkedHashSet<>(PermissionCatalog.allPermissions());
    user.createdAt = now();
    user.status = "active";
    userRepo.save(user);

    StoreInfo store = new StoreInfo();
    store.id = storeId;
    store.ownerId = String.valueOf(user.id);
    store.name = user.storeName;
    store.owner = user.fullName;
    store.phone = empty(user.phone, "");
    store.email = user.email;
    store.address = "";
    store.plan = user.plan;
    store.currency = "VND";
    store.openingHours = "08:00 - 22:00";
    store.slogan = "Quản lý bán hàng dễ dàng hơn mỗi ngày";
    storeInfoRepo.save(store);

    Warehouse warehouse = new Warehouse();
    warehouse.id = PublicIdGenerator.next("KHO", warehouseRepo.findAll(), 3);
    warehouse.storeId = storeId;
    warehouse.name = "Kho chính";
    warehouse.address = "Theo địa chỉ cửa hàng";
    warehouse.manager = user.fullName;
    warehouse.status = "active";
    warehouseRepo.save(warehouse);

    SalesChannel channel = new SalesChannel();
    channel.id = PublicIdGenerator.next("CH", channelRepo.findAll(), 3);
    channel.storeId = storeId;
    channel.name = "POS cửa hàng";
    channel.type = "offline";
    channel.status = "active";
    channel.revenue = 0L;
    channel.orders = 0;
    channel.sync = "Đang hoạt động";
    channel.icon = "store";
    channelRepo.save(channel);

    SalesChannel website = new SalesChannel();
    website.id = PublicIdGenerator.next("CH", channelRepo.findAll(), 3);
    website.storeId = storeId;
    website.name = "Website Befine.vn";
    website.type = "website";
    website.status = "connected";
    website.revenue = 0L;
    website.orders = 0;
    website.sync = "Quản lý nội bộ";
    website.icon = "globe";
    channelRepo.save(website);

    Staff staff = new Staff();
    staff.id = PublicIdGenerator.next("NV", staffRepo.findAll(), 3);
    staff.storeId = storeId;
    staff.name = user.fullName;
    staff.role = "Owner";
    staff.phone = user.phone;
    staff.email = user.email;
    staff.revenue = 0L;
    staff.orders = 0;
    staff.joinDate = LocalDate.now().toString();
    staff.status = "active";
    staffRepo.save(staff);
    staffAccountService.linkOwner(user, staff);

    String token = jwtService.generateToken(user);
    return ResponseEntity.ok(Map.of(
        "success", true,
        "tokenType", "Bearer",
        "accessToken", token,
        "expiresIn", jwtService.getExpirationSeconds(),
        "user", publicUser(user)
    ));
  }

  @GetMapping("/auth/me")
  public ResponseEntity<?> me() {
    UserAccount user = currentUser();
    if (user == null) return ResponseEntity.status(401).body(Map.of("success", false, "message", "Chưa đăng nhập"));
    return ResponseEntity.ok(publicUser(user));
  }

  @PutMapping("/auth/me")
  @Transactional
  public ResponseEntity<?> updateMe(@RequestBody Map<String, Object> payload) {
    UserAccount user = currentUser();
    if (user == null) return ResponseEntity.status(401).body(Map.of("success", false, "message", "Chưa đăng nhập"));
    String fullName = safeText(String.valueOf(payload.getOrDefault("fullName", "")));
    String phone = safeText(String.valueOf(payload.getOrDefault("phone", "")));
    String avatar = safeText(String.valueOf(payload.getOrDefault("avatar", "")));
    if (!fullName.isBlank()) user.fullName = fullName;
    user.phone = phone;
    if (!avatar.isBlank()) user.avatar = avatar;
    user.avatarInitials = initials(user.fullName);
    userRepo.save(user);

    String sid = user.storeId == null ? DEFAULT_STORE_ID : user.storeId;
    Optional<Staff> linkedStaff = user.staffId == null || user.staffId.isBlank()
        ? staffRepo.findByUserAccountId(user.id)
        : staffRepo.findById(user.staffId).filter(s -> Objects.equals(s.storeId, sid));
    if (linkedStaff.isEmpty()) {
      linkedStaff = staffRepo.findByStoreId(sid).stream()
          .filter(s -> Objects.equals(s.loginEmail, user.email) || Objects.equals(s.email, user.email))
          .findFirst();
    }
    linkedStaff.ifPresent(s -> {
      s.name = user.fullName;
      s.phone = user.phone;
      s.avatar = user.avatar;
      s.userAccountId = user.id;
      s.loginEmail = user.email;
      user.staffId = s.id;
      staffRepo.save(s);
      userRepo.save(user);
    });

    return ResponseEntity.ok(publicUser(user));
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    return Map.of("status", "UP", "service", "BefineSaaS", "security", "JWT + Spring Security", "database", "MySQL", "time", now());
  }

  @GetMapping("/state")
  public Map<String, Object> state(@RequestHeader(value = "X-Store-Id", required = false) String storeId) {
    String sid = resolveStoreId(storeId);
    if (DEFAULT_STORE_ID.equals(sid)) ensureDefaultStoreMigrated();
    UserAccount user = currentUser();
    Set<String> permissions = PermissionCatalog.effectivePermissions(user);
    List<Staff> synchronizedStaff = staffAccountService.synchronizeStoreAccounts(sid);

    Map<String, Object> map = new LinkedHashMap<>();
    // Thông tin nhận diện cửa hàng luôn cần cho header, nhưng dữ liệu nghiệp vụ
    // chỉ được trả về khi tài khoản có quyền xem module tương ứng.
    StoreInfo storeInfo = storeInfoRepo.findById(sid).orElseGet(() -> emptyStore(sid));
    map.put("storeInfo", allowed(permissions, PermissionCatalog.SETTINGS_VIEW) ? storeInfo : publicStoreInfo(storeInfo));
    map.put("warehouses", allowed(permissions, PermissionCatalog.INVENTORY_VIEW) ? warehouseRepo.findByStoreId(sid) : List.of());
    map.put("channels", allowed(permissions, PermissionCatalog.CHANNELS_VIEW) ? channelRepo.findByStoreId(sid) : List.of());
    map.put("products", allowed(permissions, PermissionCatalog.PRODUCTS_VIEW) || allowed(permissions, PermissionCatalog.POS_USE) ? productRepo.findByStoreId(sid) : List.of());
    map.put("customers", allowed(permissions, PermissionCatalog.CUSTOMERS_VIEW) || allowed(permissions, PermissionCatalog.POS_USE) ? customerRepo.findByStoreId(sid) : List.of());
    map.put("staff", allowed(permissions, PermissionCatalog.STAFF_VIEW) ? synchronizedStaff : List.of());
    map.put("suppliers", allowed(permissions, PermissionCatalog.SUPPLIERS_VIEW) ? supplierRepo.findByStoreId(sid) : List.of());
    map.put("orders", allowed(permissions, PermissionCatalog.ORDERS_VIEW) ? orderRepo.findByStoreId(sid) : List.of());
    map.put("inventoryLogs", allowed(permissions, PermissionCatalog.INVENTORY_VIEW) ? inventoryRepo.findByStoreId(sid) : List.of());
    map.put("purchaseOrders", allowed(permissions, PermissionCatalog.PURCHASES_VIEW) ? purchaseRepo.findByStoreId(sid) : List.of());
    map.put("returns", allowed(permissions, PermissionCatalog.RETURNS_VIEW) ? returnRepo.findByStoreId(sid) : List.of());
    map.put("promotions", allowed(permissions, PermissionCatalog.PROMOTIONS_VIEW) ? promotionRepo.findByStoreId(sid) : List.of());
    map.put("cashbook", allowed(permissions, PermissionCatalog.CASHBOOK_VIEW) ? cashbookRepo.findByStoreId(sid) : List.of());
    map.put("tasks", List.of());
    return map;
  }

  @PutMapping("/state")
  public ResponseEntity<?> saveState(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @RequestBody Map<String, Object> ignored) {
    // Endpoint giữ sẵn để frontend có thể nâng cấp đồng bộ bulk sau này.
    return ResponseEntity.ok(state(storeId));
  }

  @PutMapping("/store")
  public StoreInfo updateStore(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @RequestBody StoreInfo store) {
    String sid = resolveStoreId(storeId);
    StoreInfo old = storeInfoRepo.findById(sid).orElseGet(() -> emptyStore(sid));
    store.id = sid;
    store.ownerId = old.ownerId;
    if (store.name == null) store.name = old.name;
    if (store.plan == null) store.plan = old.plan;
    return storeInfoRepo.save(store);
  }

  @GetMapping("/dashboard")
  public Map<String, Object> dashboard(@RequestHeader(value = "X-Store-Id", required = false) String storeId) {
    String sid = resolveStoreId(storeId);
    List<SalesOrder> orders = orderRepo.findByStoreId(sid);
    List<Product> products = productRepo.findByStoreId(sid);
    long revenue = orders.stream().filter(o -> "completed".equals(o.status)).mapToLong(o -> safe(o.total)).sum();
    long stockValue = products.stream().mapToLong(p -> safe(p.stock) * safe(p.cost)).sum();
    long lowStock = products.stream().filter(p -> safe(p.stock) <= safe(p.minStock)).count();
    long pendingOrders = orders.stream().filter(o -> List.of("processing", "shipping").contains(o.status)).count();
    return Map.of("revenue", revenue, "orders", orders.size(), "customers", customerRepo.countByStoreId(sid), "products", products.size(), "stockValue", stockValue, "lowStock", lowStock, "pendingOrders", pendingOrders);
  }

  @GetMapping("/products") public List<Product> products(@RequestHeader(value = "X-Store-Id", required = false) String storeId) { return productRepo.findByStoreId(resolveStoreId(storeId)); }

  @PostMapping("/products")
  public Product addProduct(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @RequestBody Product p) {
    String sid = resolveStoreId(storeId);
    normalizeProductForSave(p);
    p.id = PublicIdGenerator.next("P", productRepo.findAll(), 3);
    p.storeId = sid;
    return productRepo.save(p);
  }

  @PutMapping("/products/{id}")
  public ResponseEntity<Product> updateProduct(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @PathVariable String id, @RequestBody Product payload) {
    String sid = resolveStoreId(storeId);
    return productRepo.findById(id).filter(p -> Objects.equals(p.storeId, sid)).map(p -> {
      normalizeProductForSave(payload);
      payload.id = id;
      payload.storeId = sid;
      return ResponseEntity.ok(productRepo.save(payload));
    }).orElse(ResponseEntity.notFound().build());
  }

  @DeleteMapping("/products/{id}")
  public ResponseEntity<?> deleteProduct(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @PathVariable String id) {
    String sid = resolveStoreId(storeId);
    return productRepo.findById(id).filter(p -> Objects.equals(p.storeId, sid)).map(p -> {
      productRepo.deleteById(id);
      return ResponseEntity.ok(Map.of("deleted", id));
    }).orElse(ResponseEntity.notFound().build());
  }

  @GetMapping("/customers") public List<Customer> customers(@RequestHeader(value = "X-Store-Id", required = false) String storeId) { return customerRepo.findByStoreId(resolveStoreId(storeId)); }

  @PostMapping("/customers")
  public Customer addCustomer(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @RequestBody Customer c) {
    String sid = resolveStoreId(storeId);
    c.id = PublicIdGenerator.next("KH", customerRepo.findAll(), 3);
    c.storeId = sid;
    if (c.totalOrders == null) c.totalOrders = 0;
    if (c.totalSpent == null) c.totalSpent = 0L;
    if (c.debt == null) c.debt = 0L;
    if (c.tier == null) c.tier = "new";
    if (c.tags == null || c.tags.isEmpty()) c.tags = List.of("Mới");
    if (c.joinDate == null) c.joinDate = LocalDate.now().toString();
    if (c.source == null || c.source.isBlank()) c.source = "POS cửa hàng";
    return customerRepo.save(c);
  }

  @GetMapping("/orders") public List<SalesOrder> orders(@RequestHeader(value = "X-Store-Id", required = false) String storeId) { return orderRepo.findByStoreId(resolveStoreId(storeId)); }

  @PostMapping("/orders/checkout")
  @Transactional
  public ResponseEntity<?> checkout(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @RequestBody CheckoutRequest request) {
    String sid = resolveStoreId(storeId);
    if (request == null || request.cart == null || request.cart.isEmpty()) {
      return ResponseEntity.badRequest().body(Map.of("message", "Giỏ hàng trống"));
    }

    Map<String, Product> productsById = new LinkedHashMap<>();
    Map<String, Integer> quantitiesById = new LinkedHashMap<>();
    Map<String, Long> pricesById = new LinkedHashMap<>();
    long subtotal = 0L;

    for (CheckoutRequest.CartItem item : request.cart) {
      String productId = safeText(item == null ? null : item.id);
      int qty = item == null ? 0 : safe(item.qty);
      if (productId.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "Sản phẩm không hợp lệ"));
      if (qty <= 0) return ResponseEntity.badRequest().body(Map.of("message", "Số lượng sản phẩm phải lớn hơn 0"));

      Product product = productsById.get(productId);
      if (product == null) {
        product = productRepo.findById(productId).filter(p -> Objects.equals(p.storeId, sid)).orElse(null);
        if (product == null) return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy sản phẩm " + productId));
        productsById.put(productId, product);
      }

      long linePrice = item.price == null ? safe(product.price) : item.price;
      if (linePrice < 0) return ResponseEntity.badRequest().body(Map.of("message", "Đơn giá sản phẩm không hợp lệ"));
      if (quantitiesById.containsKey(productId)) {
        return ResponseEntity.badRequest().body(Map.of("message", "Sản phẩm " + product.name + " đang bị chọn trùng trong đơn"));
      }
      if (linePrice > Long.MAX_VALUE / qty) return ResponseEntity.badRequest().body(Map.of("message", "Giá trị dòng hàng vượt giới hạn cho phép"));
      long lineAmount = linePrice * qty;
      if (subtotal > Long.MAX_VALUE - lineAmount) return ResponseEntity.badRequest().body(Map.of("message", "Tổng giá trị đơn hàng vượt giới hạn cho phép"));
      quantitiesById.put(productId, qty);
      pricesById.put(productId, linePrice);
      subtotal += lineAmount;
    }

    for (Map.Entry<String, Integer> entry : quantitiesById.entrySet()) {
      Product product = productsById.get(entry.getKey());
      if (safe(product.stock) < entry.getValue()) {
        return ResponseEntity.badRequest().body(Map.of("message", "Không đủ tồn kho: " + product.name));
      }
    }

    int discountPercent = Math.max(0, Math.min(100, safe(request.discountPercent)));
    long shippingFee = Math.max(0L, safe(request.shippingFee));
    long discount = Math.round(subtotal * discountPercent / 100.0);
    long netTotal = Math.max(0L, subtotal - discount);
    if (shippingFee > Long.MAX_VALUE - netTotal) return ResponseEntity.badRequest().body(Map.of("message", "Tổng giá trị đơn hàng vượt giới hạn cho phép"));
    long total = netTotal + shippingFee;
    String id = PublicIdGenerator.next("ĐH", orderRepo.findAll(), 6, 1233);
    SalesOrder order = new SalesOrder();
    order.id = id;
    order.storeId = sid;
    order.date = now();
    order.customer = empty(request.customer, "Khách lẻ");
    order.phone = empty(request.phone, "");
    order.email = empty(request.email, "");
    order.shippingAddress = empty(request.shippingAddress, "");
    order.shippingFee = shippingFee;
    order.sourceUrl = empty(request.sourceUrl, "");
    order.note = empty(request.note, "");
    order.payment = empty(request.payment, "Tiền mặt");
    boolean codPayment = "COD".equalsIgnoreCase(order.payment);
    order.total = total;
    order.discount = discount;
    order.paid = codPayment ? 0L : total;
    String requestedStatus = safeText(request.status).toLowerCase();
    order.status = validOrderStatus(requestedStatus) && !"cancelled".equals(requestedStatus)
        ? requestedStatus
        : (codPayment ? "processing" : "completed");
    order.channel = empty(request.channel, "POS cửa hàng");
    order.staff = empty(request.staff, "Nhân viên");

    for (Map.Entry<String, Integer> entry : quantitiesById.entrySet()) {
      Product product = productsById.get(entry.getKey());
      int qty = entry.getValue();
      long price = pricesById.getOrDefault(entry.getKey(), safe(product.price));
      product.stock = safe(product.stock) - qty;
      product.status = stockStatus(product.stock, product.minStock);
      productRepo.save(product);

      OrderItem line = new OrderItem();
      line.productId = product.id;
      line.name = product.name;
      line.qty = qty;
      line.price = price;
      order.items.add(line);

      InventoryLog log = new InventoryLog();
      log.id = PublicIdGenerator.next("IN", inventoryRepo.findAll(), 3);
      log.storeId = sid;
      log.date = now();
      log.type = "export";
      log.productId = product.id;
      log.product = product.name;
      log.sku = product.sku;
      log.qty = -qty;
      log.warehouse = product.warehouse;
      log.note = "Xuất bán đơn " + id;
      log.staff = order.staff;
      inventoryRepo.save(log);
    }

    SalesOrder saved = orderRepo.save(order);
    if (!"Khách lẻ".equalsIgnoreCase(order.customer)) {
      Optional<Customer> foundCustomer = customerRepo.findByStoreId(sid).stream()
          .filter(c -> Objects.equals(c.name, order.customer) || (!order.phone.isBlank() && Objects.equals(c.phone, order.phone)))
          .findFirst();
      Customer customer = foundCustomer.orElseGet(() -> {
        Customer created = new Customer();
        created.id = PublicIdGenerator.next("KH", customerRepo.findAll(), 3);
        created.storeId = sid;
        created.name = order.customer;
        created.phone = order.phone;
        created.email = order.email;
        created.address = order.shippingAddress;
        created.tier = "new";
        created.debt = 0L;
        created.totalOrders = 0;
        created.totalSpent = 0L;
        created.joinDate = LocalDate.now().toString();
        created.tags = new ArrayList<>();
        return created;
      });
      if (safeText(customer.phone).isBlank()) customer.phone = order.phone;
      if (safeText(customer.email).isBlank()) customer.email = order.email;
      if (safeText(customer.address).isBlank()) customer.address = order.shippingAddress;
      customer.totalOrders = safe(customer.totalOrders) + 1;
      customer.totalSpent = safe(customer.totalSpent) + total;
      customer.lastOrder = LocalDate.now().toString();
      customer.source = empty(customer.source, order.channel);
      if (customer.tags == null) customer.tags = new ArrayList<>();
      if (!customer.tags.contains(customer.source)) customer.tags.add(customer.source);
      customerRepo.save(customer);
    }

    channelRepo.findByStoreId(sid).stream().filter(ch -> Objects.equals(ch.name, order.channel)).findFirst().ifPresent(ch -> {
      ch.orders = safe(ch.orders) + 1;
      ch.revenue = safe(ch.revenue) + total;
      ch.sync = "Vừa cập nhật";
      channelRepo.save(ch);
    });
    if (order.paid != null && order.paid > 0) {
      CashbookEntry entry = new CashbookEntry();
      entry.id = PublicIdGenerator.next("PT", cashbookRepo.findAll(), 3);
      entry.storeId = sid;
      entry.date = now();
      entry.type = "receipt";
      entry.category = "Thu bán hàng";
      entry.amount = order.paid;
      entry.method = order.payment;
      entry.ref = id;
      entry.staff = order.staff;
      cashbookRepo.save(entry);
    }
    return ResponseEntity.ok(saved);
  }

  @PutMapping("/orders/{id}/status")
  @Transactional
  public ResponseEntity<?> updateOrderStatus(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @PathVariable String id, @RequestBody Map<String, String> payload) {
    String sid = resolveStoreId(storeId);
    String status = safeText(payload == null ? null : payload.get("status")).toLowerCase();
    if (!validOrderStatus(status)) return ResponseEntity.badRequest().body(Map.of("message", "Trạng thái đơn hàng không hợp lệ"));
    return orderRepo.findById(id).filter(o -> Objects.equals(o.storeId, sid)).map(o -> {
      String oldStatus = safeText(o.status).toLowerCase();
      if ("cancelled".equals(oldStatus) && !"cancelled".equals(status)) {
        return ResponseEntity.badRequest().body(Map.of("message", "Đơn đã huỷ không thể chuyển lại trạng thái khác"));
      }
      if (!"cancelled".equals(oldStatus) && "cancelled".equals(status)) {
        restoreInventoryForCancelledOrder(sid, o);
        rollbackOrderMetrics(sid, o);
      }
      o.status = status;
      return ResponseEntity.ok(orderRepo.save(o));
    }).orElse(ResponseEntity.notFound().build());
  }

  @PostMapping("/inventory/logs")
  @Transactional
  public InventoryLog addInventoryLog(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @RequestBody InventoryLog log) {
    String sid = resolveStoreId(storeId);
    if (log == null || safeText(log.productId).isBlank()) throw new IllegalArgumentException("Vui lòng chọn sản phẩm");
    Product product = productRepo.findById(log.productId)
        .filter(p -> Objects.equals(p.storeId, sid))
        .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm cần cập nhật tồn kho"));
    int qty = safe(log.qty);
    if ("export".equalsIgnoreCase(log.type) && qty > 0) qty = -qty;
    if ("import".equalsIgnoreCase(log.type) && qty < 0) qty = -qty;
    if (qty == 0) throw new IllegalArgumentException("Số lượng phải lớn hơn 0");
    if (qty < 0 && safe(product.stock) < Math.abs(qty)) {
      throw new IllegalArgumentException("Không đủ tồn kho để xuất: " + product.name);
    }

    product.stock = safe(product.stock) + qty;
    product.status = stockStatus(product.stock, product.minStock);
    productRepo.save(product);

    log.qty = qty;
    log.id = PublicIdGenerator.next("IN", inventoryRepo.findAll(), 3);
    log.storeId = sid;
    log.date = now();
    log.product = product.name;
    log.sku = product.sku;
    log.warehouse = empty(log.warehouse, product.warehouse);
    log.type = qty < 0 ? "export" : "import";
    return inventoryRepo.save(log);
  }

  @PostMapping("/suppliers") public Supplier addSupplier(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @RequestBody Supplier s) { s.id = PublicIdGenerator.next("NCC", supplierRepo.findAll(), 3); s.storeId = resolveStoreId(storeId); if (s.status == null) s.status = "active"; if (s.lastImport == null) s.lastImport = LocalDate.now().toString(); return supplierRepo.save(s); }
  @PostMapping("/channels") public SalesChannel addChannel(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @RequestBody SalesChannel c) { c.id = PublicIdGenerator.next("CH", channelRepo.findAll(), 3); c.storeId = resolveStoreId(storeId); if (c.status == null) c.status = "pending"; return channelRepo.save(c); }
  @PostMapping("/purchases")
  public PurchaseOrderEntity addPurchase(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @RequestBody PurchaseOrderEntity p) {
    if (p == null) throw new IllegalArgumentException("Dữ liệu phiếu nhập không hợp lệ");
    p.id = PublicIdGenerator.next("PN", purchaseRepo.findAll(), 3);
    p.storeId = resolveStoreId(storeId);
    if (p.date == null) p.date = LocalDate.now().toString();
    if (!validPurchaseStatus(p.status)) p.status = "draft";
    else p.status = p.status.toLowerCase();
    if (safeText(p.supplier).isBlank()) throw new IllegalArgumentException("Vui lòng chọn nhà cung cấp");
    p.total = Math.max(0L, safe(p.total));
    p.paid = Math.max(0L, Math.min(p.total, safe(p.paid)));
    p.items = Math.max(1, safe(p.items));
    return purchaseRepo.save(p);
  }

  @PutMapping("/purchases/{id}/status")
  public ResponseEntity<?> updatePurchase(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @PathVariable String id, @RequestBody Map<String,String> body) {
    String sid = resolveStoreId(storeId);
    String status = safeText(body.get("status")).toLowerCase();
    if (!validPurchaseStatus(status)) throw new IllegalArgumentException("Trạng thái phiếu nhập không hợp lệ");
    return purchaseRepo.findById(id).filter(p -> Objects.equals(p.storeId, sid)).map(p -> {
      p.status = status;
      return ResponseEntity.ok(purchaseRepo.save(p));
    }).orElse(ResponseEntity.notFound().build());
  }

  @PostMapping("/returns")
  public ReturnOrder addReturn(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @RequestBody ReturnOrder r) {
    String sid = resolveStoreId(storeId);
    if (r == null) throw new IllegalArgumentException("Dữ liệu phiếu đổi trả không hợp lệ");
    SalesOrder sourceOrder = orderRepo.findById(safeText(r.orderId)).filter(o -> Objects.equals(o.storeId, sid))
        .orElseThrow(() -> new IllegalArgumentException("Đơn hàng đổi trả không tồn tại"));
    if (safeText(r.product).isBlank()) throw new IllegalArgumentException("Vui lòng chọn sản phẩm đổi trả");
    OrderItem sourceItem = Optional.ofNullable(sourceOrder.items).orElse(List.of()).stream()
        .filter(item -> item != null && Objects.equals(safeText(item.name), safeText(r.product)))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Sản phẩm không thuộc đơn hàng đã chọn"));
    int qty = safe(r.qty);
    if (qty <= 0 || qty > safe(sourceItem.qty)) throw new IllegalArgumentException("Số lượng đổi trả không hợp lệ");
    long maxAmount = safe(sourceItem.price) > Long.MAX_VALUE / qty ? Long.MAX_VALUE : safe(sourceItem.price) * qty;
    long amount = safe(r.amount);
    if (amount < 0 || amount > maxAmount) throw new IllegalArgumentException("Giá trị đổi trả vượt giá trị sản phẩm đã mua");
    r.qty = qty;
    r.amount = amount;
    r.customer = empty(sourceOrder.customer, "Khách lẻ");
    r.id = PublicIdGenerator.next("DT", returnRepo.findAll(), 3);
    r.storeId = sid;
    if (r.date == null) r.date = LocalDate.now().toString();
    if (!validReturnStatus(r.status)) r.status = "pending";
    else r.status = r.status.toLowerCase();
    return returnRepo.save(r);
  }

  @PutMapping("/returns/{id}/status")
  public ResponseEntity<?> updateReturn(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @PathVariable String id, @RequestBody Map<String,String> body) {
    String sid = resolveStoreId(storeId);
    String status = safeText(body.get("status")).toLowerCase();
    if (!validReturnStatus(status)) throw new IllegalArgumentException("Trạng thái đổi trả không hợp lệ");
    return returnRepo.findById(id).filter(r -> Objects.equals(r.storeId, sid)).map(r -> {
      r.status = status;
      return ResponseEntity.ok(returnRepo.save(r));
    }).orElse(ResponseEntity.notFound().build());
  }
  @PostMapping("/cashbook") public CashbookEntry addCashbook(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @RequestBody CashbookEntry c) { c.id = PublicIdGenerator.next("payment".equals(c.type) ? "PC" : "PT", cashbookRepo.findAll(), 3); c.storeId = resolveStoreId(storeId); if (c.date == null) c.date = now(); return cashbookRepo.save(c); }
  @PostMapping("/staff")
  @Transactional
  public Staff addStaff(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @RequestBody Staff staff) {
    return staffAccountService.create(resolveStoreId(storeId), staff, currentUser());
  }

  @PutMapping("/staff/{id}")
  @Transactional
  public ResponseEntity<?> updateStaff(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @PathVariable String id, @RequestBody Staff incoming) {
    return ResponseEntity.ok(staffAccountService.update(resolveStoreId(storeId), id, incoming, currentUser()));
  }

  @PostMapping("/promotions") public Promotion addPromotion(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @RequestBody Promotion p) { p.id = PublicIdGenerator.next("KM", promotionRepo.findAll(), 3); p.storeId = resolveStoreId(storeId); if (p.status == null) p.status = "active"; return promotionRepo.save(p); }
  @PutMapping("/promotions/{id}")
  public ResponseEntity<?> updatePromotion(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @PathVariable String id, @RequestBody Promotion incoming) {
    String sid = resolveStoreId(storeId);
    return promotionRepo.findById(id).filter(p -> Objects.equals(p.storeId, sid)).map(existing -> {
      incoming.id = id;
      incoming.storeId = sid;
      if (incoming.status == null) incoming.status = existing.status;
      return ResponseEntity.ok(promotionRepo.save(incoming));
    }).orElse(ResponseEntity.notFound().build());
  }


  @PostMapping("/uploads/products")
  public ResponseEntity<?> uploadProductImage(@RequestParam("file") MultipartFile file) throws Exception {
    if (file == null || file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Vui lòng chọn file ảnh"));
    String contentType = empty(file.getContentType(), "");
    if (!contentType.startsWith("image/")) return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Chỉ hỗ trợ file ảnh"));
    String original = empty(file.getOriginalFilename(), "image").replaceAll("[^a-zA-Z0-9._-]", "_");
    String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')) : ".jpg";
    String filename = "product_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
    Path dir = Path.of(uploadDir, "products");
    Files.createDirectories(dir);
    Path target = dir.resolve(filename).normalize();
    Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
    return ResponseEntity.ok(Map.of("success", true, "url", "/uploads/products/" + filename, "filename", filename));
  }

  @PostMapping("/uploads/users")
  public ResponseEntity<?> uploadUserAvatar(@RequestParam("file") MultipartFile file) throws Exception {
    if (file == null || file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Vui lòng chọn file ảnh"));
    String contentType = empty(file.getContentType(), "");
    if (!contentType.startsWith("image/")) return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Chỉ hỗ trợ file ảnh"));
    String original = empty(file.getOriginalFilename(), "avatar").replaceAll("[^a-zA-Z0-9._-]", "_");
    String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')) : ".jpg";
    String filename = "user_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
    Path dir = Path.of(uploadDir, "users");
    Files.createDirectories(dir);
    Path target = dir.resolve(filename).normalize();
    Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
    return ResponseEntity.ok(Map.of("success", true, "url", "/uploads/users/" + filename, "filename", filename));
  }

  @PostMapping("/uploads/stores")
  public ResponseEntity<?> uploadStoreLogo(@RequestParam("file") MultipartFile file) throws Exception {
    if (file == null || file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Vui lòng chọn file ảnh"));
    String contentType = empty(file.getContentType(), "");
    if (!contentType.startsWith("image/")) return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Chỉ hỗ trợ file ảnh"));
    String original = empty(file.getOriginalFilename(), "store").replaceAll("[^a-zA-Z0-9._-]", "_");
    String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')) : ".jpg";
    String filename = "store_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
    Path dir = Path.of(uploadDir, "stores");
    Files.createDirectories(dir);
    Path target = dir.resolve(filename).normalize();
    Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
    return ResponseEntity.ok(Map.of("success", true, "url", "/uploads/stores/" + filename, "filename", filename));
  }

  @GetMapping(value = "/exports/products.csv", produces = "text/csv;charset=UTF-8")
  public String exportProducts(@RequestHeader(value = "X-Store-Id", required = false) String storeId) {
    String sid = resolveStoreId(storeId);
    StringBuilder csv = new StringBuilder("SKU,Tên sản phẩm,Danh mục,Giá bán,Giá vốn,Tồn kho,Trạng thái\n");
    for (Product p : productRepo.findByStoreId(sid)) {
      csv.append(csvCell(p.sku)).append(',')
         .append(csvCell(p.name)).append(',')
         .append(csvCell(p.category)).append(',')
         .append(safe(p.price)).append(',')
         .append(safe(p.cost)).append(',')
         .append(safe(p.stock)).append(',')
         .append(csvCell(p.status)).append('\n');
    }
    return csv.toString();
  }

  @GetMapping(value = "/exports/orders.csv", produces = "text/csv;charset=UTF-8")
  public String exportOrders(@RequestHeader(value = "X-Store-Id", required = false) String storeId) {
    String sid = resolveStoreId(storeId);
    StringBuilder csv = new StringBuilder("Mã đơn,Ngày,Khách hàng,SĐT,Tổng tiền,Thanh toán,Kênh,Trạng thái\n");
    for (SalesOrder o : orderRepo.findByStoreId(sid)) {
      csv.append(csvCell(o.id)).append(',')
         .append(csvCell(o.date)).append(',')
         .append(csvCell(o.customer)).append(',')
         .append(csvCell(o.phone)).append(',')
         .append(safe(o.total)).append(',')
         .append(csvCell(o.payment)).append(',')
         .append(csvCell(o.channel)).append(',')
         .append(csvCell(o.status)).append('\n');
    }
    return csv.toString();
  }

  @GetMapping(value = "/orders/{id}/invoice.html", produces = MediaType.TEXT_HTML_VALUE)
  public ResponseEntity<String> invoiceHtml(@RequestHeader(value = "X-Store-Id", required = false) String storeId, @PathVariable String id) {
    String sid = resolveStoreId(storeId);
    Optional<SalesOrder> found = orderRepo.findById(id).filter(o -> Objects.equals(o.storeId, sid));
    if (found.isEmpty()) return ResponseEntity.notFound().build();
    SalesOrder o = found.get();
    StoreInfo store = storeInfoRepo.findById(sid).orElseGet(() -> emptyStore(sid));
    StringBuilder rows = new StringBuilder();
    if (o.items != null) {
      for (OrderItem item : o.items) {
        rows.append("<tr><td>").append(escapeHtml(item.name)).append("</td><td>").append(item.qty).append("</td><td>").append(item.price).append("</td><td>").append(safe(item.qty) * safe(item.price)).append("</td></tr>");
      }
    }
    String html = "<!doctype html><html><head><meta charset='UTF-8'><title>Hóa đơn " + escapeHtml(o.id) + "</title>" +
        "<style>body{font-family:Arial,sans-serif;margin:32px;color:#111827}.box{max-width:720px;margin:auto;border:1px solid #e5e7eb;border-radius:16px;padding:24px}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border-bottom:1px solid #e5e7eb;padding:10px;text-align:left}.total{text-align:right;font-size:20px;font-weight:800}@media print{button{display:none}.box{border:0}}</style></head><body>" +
        "<div class='box'><button onclick='window.print()'>In hóa đơn</button><h1>" + escapeHtml(store.name) + "</h1><p>Hóa đơn: <b>" + escapeHtml(o.id) + "</b><br>Ngày: " + escapeHtml(o.date) + "<br>Khách hàng: " + escapeHtml(o.customer) + " - " + escapeHtml(o.phone) + "</p>" +
        "<table><thead><tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>" + rows + "</tbody></table>" +
        "<p class='total'>Tổng tiền: " + safe(o.total) + " VND</p></div></body></html>";
    return ResponseEntity.ok(html);
  }

  private void ensureDefaultStoreMigrated() {
    if (storeInfoRepo.findById(DEFAULT_STORE_ID).isEmpty()) {
      storeInfoRepo.findById("STORE").ifPresent(old -> {
        StoreInfo s = new StoreInfo();
        s.id = DEFAULT_STORE_ID;
        s.ownerId = old.ownerId;
        s.name = old.name; s.owner = old.owner; s.phone = old.phone; s.email = old.email; s.address = old.address; s.city = old.city; s.logo = old.logo;
        s.branchAddress = old.branchAddress; s.website = old.website; s.sourceArea = old.sourceArea; s.slogan = old.slogan;
        s.plan = old.plan; s.taxCode = old.taxCode; s.currency = old.currency; s.openingHours = old.openingHours;
        storeInfoRepo.save(s);
      });
    }
    userRepo.findAll().forEach(u -> { if (u.storeId == null || u.storeId.isBlank()) { u.storeId = DEFAULT_STORE_ID; if (u.plan == null) u.plan = "BefineSaaS"; userRepo.save(u); } });
    warehouseRepo.findAll().forEach(x -> { if (x.storeId == null || x.storeId.isBlank()) { x.storeId = DEFAULT_STORE_ID; warehouseRepo.save(x); } });
    productRepo.findAll().forEach(x -> { if (x.storeId == null || x.storeId.isBlank()) { x.storeId = DEFAULT_STORE_ID; productRepo.save(x); } });
    customerRepo.findAll().forEach(x -> { if (x.storeId == null || x.storeId.isBlank()) { x.storeId = DEFAULT_STORE_ID; customerRepo.save(x); } });
    staffRepo.findAll().forEach(x -> { if (x.storeId == null || x.storeId.isBlank()) { x.storeId = DEFAULT_STORE_ID; staffRepo.save(x); } });
    supplierRepo.findAll().forEach(x -> { if (x.storeId == null || x.storeId.isBlank()) { x.storeId = DEFAULT_STORE_ID; supplierRepo.save(x); } });
    channelRepo.findAll().forEach(x -> { if (x.storeId == null || x.storeId.isBlank()) { x.storeId = DEFAULT_STORE_ID; channelRepo.save(x); } });
    orderRepo.findAll().forEach(x -> { if (x.storeId == null || x.storeId.isBlank()) { x.storeId = DEFAULT_STORE_ID; orderRepo.save(x); } });
    inventoryRepo.findAll().forEach(x -> { if (x.storeId == null || x.storeId.isBlank()) { x.storeId = DEFAULT_STORE_ID; inventoryRepo.save(x); } });
    purchaseRepo.findAll().forEach(x -> { if (x.storeId == null || x.storeId.isBlank()) { x.storeId = DEFAULT_STORE_ID; purchaseRepo.save(x); } });
    returnRepo.findAll().forEach(x -> { if (x.storeId == null || x.storeId.isBlank()) { x.storeId = DEFAULT_STORE_ID; returnRepo.save(x); } });
    promotionRepo.findAll().forEach(x -> { if (x.storeId == null || x.storeId.isBlank()) { x.storeId = DEFAULT_STORE_ID; promotionRepo.save(x); } });
    cashbookRepo.findAll().forEach(x -> { if (x.storeId == null || x.storeId.isBlank()) { x.storeId = DEFAULT_STORE_ID; cashbookRepo.save(x); } });
  }

  private String resolveStoreId(String storeId) {
    UserAccount authUser = currentUser();
    if (authUser != null && authUser.storeId != null && !authUser.storeId.isBlank()) return authUser.storeId;
    return storeId == null || storeId.isBlank() ? DEFAULT_STORE_ID : storeId;
  }
  private UserAccount currentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof UserAccount user) return user;
    return null;
  }
  private StoreInfo publicStoreInfo(StoreInfo source) {
    StoreInfo safe = new StoreInfo();
    safe.id = source.id;
    safe.name = source.name;
    safe.owner = source.owner;
    safe.phone = source.phone;
    safe.email = source.email;
    safe.address = source.address;
    safe.city = source.city;
    safe.logo = source.logo;
    safe.website = source.website;
    safe.slogan = source.slogan;
    safe.plan = source.plan;
    safe.currency = source.currency;
    safe.openingHours = source.openingHours;
    return safe;
  }

  private StoreInfo emptyStore(String sid) { StoreInfo s = new StoreInfo(); s.id = sid; s.name = "Cửa hàng của bạn"; s.plan = "BefineSaaS"; s.currency = "VND"; return s; }
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
    m.put("avatarInitials", empty(u.avatarInitials, initials(u.fullName)));
    m.put("createdAt", u.createdAt);
    return m;
  }
  private void restoreInventoryForCancelledOrder(String sid, SalesOrder order) {
    for (OrderItem item : Optional.ofNullable(order.items).orElse(List.of())) {
      if (item == null || safe(item.qty) <= 0) continue;
      productRepo.findById(item.productId).filter(p -> Objects.equals(p.storeId, sid)).ifPresent(product -> {
        product.stock = safe(product.stock) + safe(item.qty);
        product.status = stockStatus(product.stock, product.minStock);
        productRepo.save(product);

        InventoryLog log = new InventoryLog();
        log.id = PublicIdGenerator.next("IN", inventoryRepo.findAll(), 3);
        log.storeId = sid;
        log.date = now();
        log.type = "import";
        log.productId = product.id;
        log.product = product.name;
        log.sku = product.sku;
        log.qty = safe(item.qty);
        log.warehouse = empty(product.warehouse, "Kho chính");
        log.note = "Hoàn tồn khi huỷ đơn " + order.id;
        UserAccount user = currentUser();
        log.staff = user == null ? empty(order.staff, "Nhân viên") : empty(user.fullName, empty(order.staff, "Nhân viên"));
        inventoryRepo.save(log);
      });
    }
  }

  private void rollbackOrderMetrics(String sid, SalesOrder order) {
    if (!"Khách lẻ".equalsIgnoreCase(empty(order.customer, "Khách lẻ"))) {
      customerRepo.findByStoreId(sid).stream()
          .filter(c -> Objects.equals(c.name, order.customer) || (!safeText(order.phone).isBlank() && Objects.equals(c.phone, order.phone)))
          .findFirst()
          .ifPresent(customer -> {
            customer.totalOrders = Math.max(0, safe(customer.totalOrders) - 1);
            customer.totalSpent = Math.max(0L, safe(customer.totalSpent) - safe(order.total));
            customerRepo.save(customer);
          });
    }
    channelRepo.findByStoreId(sid).stream()
        .filter(channel -> Objects.equals(channel.name, order.channel))
        .findFirst()
        .ifPresent(channel -> {
          channel.orders = Math.max(0, safe(channel.orders) - 1);
          channel.revenue = Math.max(0L, safe(channel.revenue) - safe(order.total));
          channel.sync = "Vừa cập nhật";
          channelRepo.save(channel);
        });
  }

  private static boolean allowed(Set<String> permissions, String permission) { return permissions != null && permissions.contains(permission); }
  private static String now() { return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")); }
  private static void normalizeProductForSave(Product product) {
    if (product == null) throw new IllegalArgumentException("Dữ liệu sản phẩm không hợp lệ");
    product.name = safeText(product.name);
    if (product.name.isBlank()) throw new IllegalArgumentException("Tên sản phẩm không được để trống");
    product.price = Math.max(0L, safe(product.price));
    product.compareAtPrice = Math.max(0L, safe(product.compareAtPrice));
    product.cost = Math.max(0L, safe(product.cost));
    product.stock = Math.max(0, safe(product.stock));
    product.minStock = Math.max(0, safe(product.minStock));
    product.weight = Math.max(0, safe(product.weight));
    product.taxRate = product.taxRate == null ? 0D : Math.max(0D, Math.min(100D, product.taxRate));
    product.status = stockStatus(product.stock, product.minStock);
    if (product.channel == null || product.channel.isEmpty()) product.channel = new ArrayList<>(List.of("POS cửa hàng", "Website Befine.vn"));
    else product.channel = new ArrayList<>(product.channel);
    if (product.tags == null) product.tags = new ArrayList<>();
    else product.tags = new ArrayList<>(product.tags);
  }
  private static boolean validOrderStatus(String status) {
    return Set.of("processing", "shipping", "completed", "cancelled").contains(safeText(status).toLowerCase());
  }
  private static boolean validPurchaseStatus(String status) {
    return Set.of("draft", "ordered", "partial", "received", "cancelled").contains(safeText(status).toLowerCase());
  }
  private static boolean validReturnStatus(String status) {
    return Set.of("pending", "approved", "refunded", "cancelled").contains(safeText(status).toLowerCase());
  }
  private static String stockStatus(Integer stock, Integer minStock) { int s = safe(stock), m = safe(minStock); return s <= 0 ? "out_of_stock" : s <= m ? "low_stock" : "active"; }
  private static int safe(Integer v) { return v == null ? 0 : v; }
  private static long safe(Long v) { return v == null ? 0L : v; }
  private static String empty(String v, String fallback) { return v == null || v.isBlank() ? fallback : v; }
  private static String safeText(String v) { return v == null ? "" : v.trim(); }
  private static String csvCell(String value) { return "\"" + empty(value, "").replace("\"", "\"\"") + "\""; }
  private static String escapeHtml(String value) { return empty(value, "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;"); }
  private static String initials(String fullName) {
    if (fullName == null || fullName.isBlank()) return "U";
    String[] parts = fullName.trim().split("\\s+");
    if (parts.length == 1) return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
    return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
  }
}
