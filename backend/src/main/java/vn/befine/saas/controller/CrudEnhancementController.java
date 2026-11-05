package vn.befine.saas.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.befine.saas.entity.*;
import vn.befine.saas.repository.*;
import vn.befine.saas.util.PublicIdGenerator;
import vn.befine.saas.service.StaffAccountService;

import java.time.LocalDate;
import java.util.*;

@RestController
public class CrudEnhancementController {
  private static final String DEFAULT_STORE_ID = "store_befine_default";
  private final CustomerRepository customerRepo;
  private final SupplierRepository supplierRepo;
  private final SalesChannelRepository channelRepo;
  private final PurchaseOrderRepository purchaseRepo;
  private final ReturnOrderRepository returnRepo;
  private final CashbookRepository cashbookRepo;
  private final StaffRepository staffRepo;
  private final PromotionRepository promotionRepo;
  private final WarehouseRepository warehouseRepo;
  private final StaffAccountService staffAccountService;

  public CrudEnhancementController(CustomerRepository customerRepo, SupplierRepository supplierRepo, SalesChannelRepository channelRepo,
      PurchaseOrderRepository purchaseRepo, ReturnOrderRepository returnRepo, CashbookRepository cashbookRepo, StaffRepository staffRepo,
      PromotionRepository promotionRepo, WarehouseRepository warehouseRepo, StaffAccountService staffAccountService) {
    this.customerRepo = customerRepo;
    this.supplierRepo = supplierRepo;
    this.channelRepo = channelRepo;
    this.purchaseRepo = purchaseRepo;
    this.returnRepo = returnRepo;
    this.cashbookRepo = cashbookRepo;
    this.staffRepo = staffRepo;
    this.promotionRepo = promotionRepo;
    this.warehouseRepo = warehouseRepo;
    this.staffAccountService = staffAccountService;
  }

  @PutMapping("/customers/{id}") public ResponseEntity<?> updateCustomer(@PathVariable String id, @RequestBody Customer c) { String sid = resolveStoreId(null); return customerRepo.findById(id).filter(x -> Objects.equals(x.storeId, sid)).map(x -> { c.id = id; c.storeId = sid; normalizeCustomer(c); return ResponseEntity.ok(customerRepo.save(c)); }).orElse(ResponseEntity.notFound().build()); }
  @DeleteMapping("/customers/{id}") public ResponseEntity<?> deleteCustomer(@PathVariable String id) { return deleteScoped(id, customerRepo); }

  @PutMapping("/suppliers/{id}") public ResponseEntity<?> updateSupplier(@PathVariable String id, @RequestBody Supplier s) { String sid = resolveStoreId(null); return supplierRepo.findById(id).filter(x -> Objects.equals(x.storeId, sid)).map(x -> { s.id = id; s.storeId = sid; if (s.status == null) s.status = "active"; return ResponseEntity.ok(supplierRepo.save(s)); }).orElse(ResponseEntity.notFound().build()); }
  @DeleteMapping("/suppliers/{id}") public ResponseEntity<?> deleteSupplier(@PathVariable String id) { return deleteScoped(id, supplierRepo); }

  @PutMapping("/channels/{id}") public ResponseEntity<?> updateChannel(@PathVariable String id, @RequestBody SalesChannel c) { String sid = resolveStoreId(null); return channelRepo.findById(id).filter(x -> Objects.equals(x.storeId, sid)).map(x -> { c.id = id; c.storeId = sid; if (c.status == null) c.status = x.status; if (c.sync == null) c.sync = x.sync; return ResponseEntity.ok(channelRepo.save(c)); }).orElse(ResponseEntity.notFound().build()); }
  @DeleteMapping("/channels/{id}") public ResponseEntity<?> deleteChannel(@PathVariable String id) { return deleteScoped(id, channelRepo); }

  @PutMapping("/cashbook/{id}") public ResponseEntity<?> updateCashbook(@PathVariable String id, @RequestBody CashbookEntry c) { String sid = resolveStoreId(null); return cashbookRepo.findById(id).filter(x -> Objects.equals(x.storeId, sid)).map(x -> { c.id = id; c.storeId = sid; if (c.date == null) c.date = x.date; return ResponseEntity.ok(cashbookRepo.save(c)); }).orElse(ResponseEntity.notFound().build()); }
  @DeleteMapping("/cashbook/{id}") public ResponseEntity<?> deleteCashbook(@PathVariable String id) { return deleteScoped(id, cashbookRepo); }

  @DeleteMapping("/staff/{id}")
  @Transactional
  public ResponseEntity<?> deleteStaff(@PathVariable String id) {
    staffAccountService.delete(resolveStoreId(null), id, currentUser());
    return ResponseEntity.ok(Map.of("success", true, "deleted", id));
  }
  @DeleteMapping("/promotions/{id}") public ResponseEntity<?> deletePromotion(@PathVariable String id) { return deleteScoped(id, promotionRepo); }
  @DeleteMapping("/purchases/{id}") public ResponseEntity<?> deletePurchase(@PathVariable String id) { return deleteScoped(id, purchaseRepo); }
  @DeleteMapping("/returns/{id}") public ResponseEntity<?> deleteReturn(@PathVariable String id) { return deleteScoped(id, returnRepo); }

  @GetMapping("/warehouses") public List<Warehouse> warehouses(@RequestHeader(value = "X-Store-Id", required = false) String storeId) { return warehouseRepo.findByStoreId(resolveStoreId(storeId)); }
  @PostMapping("/warehouses") public Warehouse addWarehouse(@RequestBody Warehouse w) { w.id = PublicIdGenerator.next("KHO", warehouseRepo.findAll(), 3); w.storeId = resolveStoreId(null); if (w.status == null) w.status = "active"; return warehouseRepo.save(w); }
  @PutMapping("/warehouses/{id}") public ResponseEntity<?> updateWarehouse(@PathVariable String id, @RequestBody Warehouse w) { String sid = resolveStoreId(null); return warehouseRepo.findById(id).filter(x -> Objects.equals(x.storeId, sid)).map(x -> { w.id = id; w.storeId = sid; return ResponseEntity.ok(warehouseRepo.save(w)); }).orElse(ResponseEntity.notFound().build()); }
  @DeleteMapping("/warehouses/{id}") public ResponseEntity<?> deleteWarehouse(@PathVariable String id) { return deleteScoped(id, warehouseRepo); }

  @PatchMapping("/channels/{id}/sync")
  @Transactional
  public ResponseEntity<?> syncChannel(@PathVariable String id) {
    String sid = resolveStoreId(null);
    return channelRepo.findById(id).filter(c -> Objects.equals(c.storeId, sid)).map(c -> {
      c.lastSyncAt = java.time.LocalDateTime.now().toString();
      c.sync = "Vừa đồng bộ";
      c.apiStatus = "ok";
      if (c.status == null || "pending".equalsIgnoreCase(c.status)) c.status = "connected";
      channelRepo.save(c);
      return ResponseEntity.ok(Map.of(
          "success", true,
          "message", "Đã chạy đồng bộ thử nghiệm cho kênh " + c.name,
          "channel", c,
          "note", "Đây là skeleton connector. Đồng bộ thật cần API key/token của nền tảng."
      ));
    }).orElse(ResponseEntity.notFound().build());
  }

  @PatchMapping("/channels/{id}/config")
  @Transactional
  public ResponseEntity<?> configureChannel(@PathVariable String id, @RequestBody Map<String, String> payload) {
    String sid = resolveStoreId(null);
    return channelRepo.findById(id).filter(c -> Objects.equals(c.storeId, sid)).map(c -> {
      c.apiProvider = payload.getOrDefault("apiProvider", c.apiProvider);
      c.externalStoreId = payload.getOrDefault("externalStoreId", c.externalStoreId);
      c.syncDirection = payload.getOrDefault("syncDirection", c.syncDirection == null ? "two_way" : c.syncDirection);
      c.webhookUrl = payload.getOrDefault("webhookUrl", c.webhookUrl);
      c.notes = payload.getOrDefault("notes", c.notes);
      c.apiStatus = "configured";
      c.status = "connected";
      c.sync = "Đã cấu hình API";
      c.lastSyncAt = java.time.LocalDateTime.now().toString();
      return ResponseEntity.ok(channelRepo.save(c));
    }).orElse(ResponseEntity.notFound().build());
  }

  private <T> ResponseEntity<?> deleteScoped(String id, org.springframework.data.repository.CrudRepository<T, String> repo) {
    String sid = resolveStoreId(null);
    Optional<T> entity = repo.findById(id);
    if (entity.isEmpty()) return ResponseEntity.notFound().build();
    try {
      Object storeId = entity.get().getClass().getField("storeId").get(entity.get());
      if (!Objects.equals(storeId, sid)) return ResponseEntity.notFound().build();
      repo.deleteById(id);
      return ResponseEntity.ok(Map.of("deleted", id));
    } catch (Exception ex) {
      return ResponseEntity.badRequest().body(Map.of("success", false, "message", ex.getMessage()));
    }
  }

  private void normalizeCustomer(Customer c) {
    if (c.totalOrders == null) c.totalOrders = 0;
    if (c.totalSpent == null) c.totalSpent = 0L;
    if (c.debt == null) c.debt = 0L;
    if (c.tier == null) c.tier = "new";
    if (c.joinDate == null) c.joinDate = LocalDate.now().toString();
    if (c.tags == null) c.tags = new ArrayList<>();
  }
  private UserAccount currentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return auth != null && auth.getPrincipal() instanceof UserAccount user ? user : null;
  }

  private String resolveStoreId(String storeId) {
    UserAccount user = currentUser();
    if (user != null && user.storeId != null && !user.storeId.isBlank()) return user.storeId;
    return storeId == null || storeId.isBlank() ? DEFAULT_STORE_ID : storeId;
  }
}
