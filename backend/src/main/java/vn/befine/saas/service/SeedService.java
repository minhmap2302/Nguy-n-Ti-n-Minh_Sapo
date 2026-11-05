package vn.befine.saas.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.lang.reflect.Field;
import java.util.Optional;
import vn.befine.saas.entity.*;
import vn.befine.saas.repository.*;
import vn.befine.saas.security.PasswordUtil;
import vn.befine.saas.security.PermissionCatalog;

@Service
public class SeedService implements CommandLineRunner {
  public static final String DEFAULT_STORE_ID = "store_befine_default";
  private final ObjectMapper mapper;
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

  public SeedService(ObjectMapper mapper, StoreInfoRepository storeInfoRepo, WarehouseRepository warehouseRepo,
      ProductRepository productRepo, CustomerRepository customerRepo, StaffRepository staffRepo,
      SupplierRepository supplierRepo, SalesChannelRepository channelRepo, SalesOrderRepository orderRepo,
      InventoryLogRepository inventoryRepo, PurchaseOrderRepository purchaseRepo, ReturnOrderRepository returnRepo,
      PromotionRepository promotionRepo, CashbookRepository cashbookRepo, UserAccountRepository userRepo) {
    this.mapper = mapper;
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
  }

  @Override
  public void run(String... args) throws Exception {
    if (productRepo.count() == 0) {
      resetDatabase();
    } else {
      ensureDefaultAdmin();
      ensureWebsiteChannel();
      ensureOfficialCatalogAdditions();
    }
  }

  @Transactional
  public void ensureDefaultAdmin() {
    Optional<UserAccount> existing = userRepo.findByEmail("admin@befine.vn");
    if (existing.isPresent()) {
      UserAccount admin = existing.get();
      admin.role = "OWNER";
      admin.permissions = new java.util.LinkedHashSet<>(PermissionCatalog.allPermissions());
      if (admin.status == null || admin.status.isBlank()) admin.status = "active";
      userRepo.save(admin);
      return;
    }
    UserAccount admin = new UserAccount();
    admin.email = "admin@befine.vn";
    admin.passwordHash = PasswordUtil.hash("123456");
    admin.fullName = "Mai Befine";
    admin.phone = "098 693 46 41";
    admin.storeId = DEFAULT_STORE_ID;
    admin.storeName = "Befine Life - Hà Đông";
    admin.storeType = "natural";
    admin.plan = "BefineSaaS";
    admin.avatarInitials = "MB";
    admin.createdAt = java.time.LocalDateTime.now().toString();
    admin.role = "OWNER";
    admin.permissions = new java.util.LinkedHashSet<>(PermissionCatalog.allPermissions());
    admin.status = "active";
    userRepo.save(admin);
  }


  @Transactional
  public void ensureWebsiteChannel() {
    boolean exists = channelRepo.findAll().stream().anyMatch(c -> "Website Befine.vn".equalsIgnoreCase(c.name));
    if (!exists) {
      SalesChannel web = new SalesChannel();
      web.id = "CH02";
      web.storeId = DEFAULT_STORE_ID;
      web.name = "Website Befine.vn";
      web.type = "website";
      web.status = "connected";
      web.revenue = 0L;
      web.orders = 0;
      web.sync = "Quản lý nội bộ";
      web.icon = "globe";
      web.apiProvider = "befine.vn";
      web.apiStatus = "manual";
      web.syncDirection = "manual";
      web.notes = "Kênh website chính thức của Befine, quản lý đơn/sản phẩm/khuyến mãi nội bộ trước khi kết nối API thật.";
      channelRepo.save(web);
    }
  }

  @Transactional
  public void ensureOfficialCatalogAdditions() throws Exception {
    java.util.Set<String> additionIds = java.util.Set.of("P073", "P074", "P075", "P076", "P077");
    JsonNode root = mapper.readTree(new ClassPathResource("seed-data.json").getInputStream());
    for (JsonNode node : root.withArray("products")) {
      String id = node.path("id").asText("");
      if (!additionIds.contains(id) || productRepo.existsById(id)) continue;
      Product product = mapper.treeToValue(node, Product.class);
      product.storeId = DEFAULT_STORE_ID;
      productRepo.save(product);
    }
  }

  @Transactional
  public void resetDatabase() throws Exception {
    cashbookRepo.deleteAll();
    promotionRepo.deleteAll();
    returnRepo.deleteAll();
    purchaseRepo.deleteAll();
    inventoryRepo.deleteAll();
    orderRepo.deleteAll();
    channelRepo.deleteAll();
    supplierRepo.deleteAll();
    staffRepo.deleteAll();
    customerRepo.deleteAll();
    productRepo.deleteAll();
    warehouseRepo.deleteAll();
    storeInfoRepo.deleteAll();
    userRepo.deleteAll();

    JsonNode root = mapper.readTree(new ClassPathResource("seed-data.json").getInputStream());
    UserAccount admin = new UserAccount();
    admin.email = "admin@befine.vn";
    admin.passwordHash = PasswordUtil.hash("123456");
    admin.fullName = "Mai Befine";
    admin.phone = "098 693 46 41";
    admin.storeId = DEFAULT_STORE_ID;
    admin.storeName = "Befine Life - Hà Đông";
    admin.storeType = "natural";
    admin.plan = "BefineSaaS";
    admin.avatarInitials = "MB";
    admin.createdAt = java.time.LocalDateTime.now().toString();
    admin.role = "OWNER";
    admin.permissions = new java.util.LinkedHashSet<>(PermissionCatalog.allPermissions());
    admin.status = "active";
    userRepo.save(admin);

    StoreInfo store = mapper.treeToValue(root.get("storeInfo"), StoreInfo.class);
    store.id = DEFAULT_STORE_ID;
    store.ownerId = "user_admin_default";
    storeInfoRepo.save(store);

    for (JsonNode n : root.withArray("warehouses")) warehouseRepo.save(withStore(mapper.treeToValue(n, Warehouse.class)));
    for (JsonNode n : root.withArray("products")) productRepo.save(withStore(mapper.treeToValue(n, Product.class)));
    for (JsonNode n : root.withArray("customers")) customerRepo.save(withStore(mapper.treeToValue(n, Customer.class)));
    for (JsonNode n : root.withArray("staff")) staffRepo.save(withStore(mapper.treeToValue(n, Staff.class)));
    staffRepo.findByStoreIdAndEmailIgnoreCase(DEFAULT_STORE_ID, admin.email).ifPresent(owner -> {
      owner.loginEnabled = true;
      owner.userAccountId = admin.id;
      owner.loginEmail = admin.email;
      owner.systemRole = "OWNER";
      owner.accountStatus = "active";
      owner.permissions = new java.util.ArrayList<>(PermissionCatalog.allPermissions());
      staffRepo.save(owner);
      admin.staffId = owner.id;
      userRepo.save(admin);
    });
    for (JsonNode n : root.withArray("suppliers")) supplierRepo.save(withStore(mapper.treeToValue(n, Supplier.class)));
    for (JsonNode n : root.withArray("channels")) channelRepo.save(withStore(mapper.treeToValue(n, SalesChannel.class)));
    for (JsonNode n : root.withArray("orders")) orderRepo.save(withStore(mapper.treeToValue(n, SalesOrder.class)));
    for (JsonNode n : root.withArray("inventoryLogs")) inventoryRepo.save(withStore(mapper.treeToValue(n, InventoryLog.class)));
    for (JsonNode n : root.withArray("purchaseOrders")) purchaseRepo.save(withStore(mapper.treeToValue(n, PurchaseOrderEntity.class)));
    for (JsonNode n : root.withArray("returns")) returnRepo.save(withStore(mapper.treeToValue(n, ReturnOrder.class)));
    for (JsonNode n : root.withArray("promotions")) promotionRepo.save(withStore(mapper.treeToValue(n, Promotion.class)));
    for (JsonNode n : root.withArray("cashbook")) cashbookRepo.save(withStore(mapper.treeToValue(n, CashbookEntry.class)));
  }

  private <T> T withStore(T entity) {
    try {
      Field f = entity.getClass().getField("storeId");
      f.set(entity, DEFAULT_STORE_ID);
    } catch (Exception ignored) {}
    return entity;
  }
}
