package vn.befine.saas.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.befine.saas.entity.Staff;
import vn.befine.saas.entity.StoreInfo;
import vn.befine.saas.entity.UserAccount;
import vn.befine.saas.repository.StaffRepository;
import vn.befine.saas.repository.StoreInfoRepository;
import vn.befine.saas.repository.UserAccountRepository;
import vn.befine.saas.security.PasswordUtil;
import vn.befine.saas.security.PermissionCatalog;
import vn.befine.saas.util.PublicIdGenerator;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class StaffAccountService {
  private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

  private final StaffRepository staffRepo;
  private final UserAccountRepository userRepo;
  private final StoreInfoRepository storeInfoRepo;

  public StaffAccountService(StaffRepository staffRepo, UserAccountRepository userRepo, StoreInfoRepository storeInfoRepo) {
    this.staffRepo = staffRepo;
    this.userRepo = userRepo;
    this.storeInfoRepo = storeInfoRepo;
  }

  @Transactional
  public Staff create(String storeId, Staff incoming, UserAccount actor) {
    Staff staff = normalizeStaff(incoming, null, storeId);
    if ("OWNER".equals(PermissionCatalog.normalizeRole(staff.systemRole))) {
      throw new IllegalArgumentException("Không thể tạo thêm tài khoản chủ cửa hàng từ màn hình nhân viên");
    }
    validateDelegation(actor, staff.systemRole, staff.permissions);
    staff.id = PublicIdGenerator.next("NV", staffRepo.findAll(), 3);
    staffRepo.save(staff);

    if (Boolean.TRUE.equals(staff.loginEnabled)) {
      UserAccount account = createAccountForStaff(staff, requirePassword(incoming.accountPassword));
      link(staff, account, true);
    } else {
      staff.accountStatus = "inactive";
      staff.userAccountId = null;
      staffRepo.save(staff);
    }
    return staff;
  }

  @Transactional
  public Staff update(String storeId, String staffId, Staff incoming, UserAccount actor) {
    Staff existing = staffRepo.findById(staffId)
        .filter(s -> Objects.equals(s.storeId, storeId))
        .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên"));

    UserAccount account = findLinkedAccount(existing).orElse(null);
    boolean targetIsOwner = isOwner(existing, account);
    boolean editingSelf = actor != null && account != null && Objects.equals(actor.id, account.id);
    ensureCanManageExisting(actor, existing, account);

    if (targetIsOwner) {
      if (!Boolean.TRUE.equals(incoming.loginEnabled)
          || "inactive".equalsIgnoreCase(safe(incoming.accountStatus))
          || (!safe(incoming.systemRole).isBlank() && !"OWNER".equals(PermissionCatalog.normalizeRole(incoming.systemRole)))) {
        throw new IllegalArgumentException("Không thể tắt, vô hiệu hóa hoặc hạ quyền tài khoản chủ cửa hàng");
      }
    }
    if (editingSelf && !Boolean.TRUE.equals(incoming.loginEnabled)) {
      throw new IllegalArgumentException("Bạn không thể tự tắt tài khoản đang đăng nhập");
    }

    Staff staff = normalizeStaff(incoming, existing, storeId);
    staff.id = staffId;
    if (!targetIsOwner && "OWNER".equals(PermissionCatalog.normalizeRole(staff.systemRole))) {
      throw new IllegalArgumentException("Không thể cấp vai trò chủ cửa hàng từ màn hình nhân viên");
    }
    if (!targetIsOwner) validateDelegation(actor, staff.systemRole, staff.permissions);
    if (editingSelf && account != null) {
      String oldRole = PermissionCatalog.normalizeRole(account.role);
      Set<String> oldPermissions = PermissionCatalog.effectivePermissions(account);
      Set<String> nextPermissions = PermissionCatalog.normalizeRequested(staff.systemRole, staff.permissions);
      if (!oldRole.equals(PermissionCatalog.normalizeRole(staff.systemRole)) || !oldPermissions.equals(nextPermissions)) {
        throw new IllegalArgumentException("Bạn không thể tự thay đổi vai trò hoặc quyền của tài khoản đang đăng nhập");
      }
    }
    if (targetIsOwner) {
      staff.loginEnabled = true;
      staff.systemRole = "OWNER";
      staff.accountStatus = "active";
      staff.permissions = new ArrayList<>(PermissionCatalog.allPermissions());
    }
    staffRepo.save(staff);

    if (!Boolean.TRUE.equals(staff.loginEnabled)) {
      if (account != null) {
        account.status = "inactive";
        userRepo.save(account);
        link(staff, account, false);
      } else {
        staff.userAccountId = null;
        staff.accountStatus = "inactive";
        staffRepo.save(staff);
      }
      return staff;
    }

    String password = safe(incoming.accountPassword);
    if (account == null) {
      account = createAccountForStaff(staff, requirePassword(password));
    } else {
      String nextEmail = resolveLoginEmail(staff);
      ensureEmailAvailable(nextEmail, account.id);
      if (editingSelf && !Objects.equals(normalizeEmail(account.email), nextEmail)) {
        throw new IllegalArgumentException("Không thể đổi email của chính tài khoản đang đăng nhập tại màn hình nhân viên");
      }
      account.email = nextEmail;
      account.fullName = staff.name;
      account.phone = safe(staff.phone);
      account.avatar = staff.avatar;
      account.avatarInitials = initials(staff.name);
      account.role = targetIsOwner ? "OWNER" : PermissionCatalog.normalizeRole(staff.systemRole);
      account.permissions = new LinkedHashSet<>(targetIsOwner
          ? PermissionCatalog.allPermissions()
          : PermissionCatalog.normalizeRequested(account.role, staff.permissions));
      account.status = accountStatusFor(staff);
      account.storeId = storeId;
      applyStoreMetadata(account, storeId);
      account.staffId = staff.id;
      if (!password.isBlank()) {
        if (password.length() < 6) throw new IllegalArgumentException("Mật khẩu tạm thời phải có ít nhất 6 ký tự");
        account.passwordHash = PasswordUtil.hash(password);
      }
      userRepo.save(account);
    }

    link(staff, account, true);
    return staff;
  }

  @Transactional
  public void delete(String storeId, String staffId, UserAccount actor) {
    Staff staff = staffRepo.findById(staffId)
        .filter(s -> Objects.equals(s.storeId, storeId))
        .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên"));
    UserAccount account = findLinkedAccount(staff).orElse(null);
    if (isOwner(staff, account)) throw new IllegalArgumentException("Không thể xoá tài khoản chủ cửa hàng");
    ensureCanManageExisting(actor, staff, account);
    if (actor != null && account != null && Objects.equals(actor.id, account.id)) {
      throw new IllegalArgumentException("Bạn không thể tự xoá tài khoản đang đăng nhập");
    }
    if (account != null) userRepo.delete(account);
    staffRepo.delete(staff);
  }

  /**
   * Nâng cấp dữ liệu cũ: tự nối tài khoản và hồ sơ nhân viên theo id/email. Tài
   * khoản cũ chưa có quyền chi tiết sẽ nhận quyền mặc định của vai trò hiện tại.
   */
  @Transactional
  public List<Staff> synchronizeStoreAccounts(String storeId) {
    List<Staff> staffList = new ArrayList<>(staffRepo.findByStoreId(storeId));
    Map<String, Staff> byId = new LinkedHashMap<>();
    Map<String, Staff> byEmail = new LinkedHashMap<>();
    Map<String, List<Staff>> byName = new LinkedHashMap<>();
    for (Staff staff : staffList) {
      byId.put(staff.id, staff);
      String email = normalizeEmail(firstNonBlank(staff.loginEmail, staff.email));
      if (!email.isBlank()) byEmail.putIfAbsent(email, staff);
      String nameKey = normalizeName(staff.name);
      if (!nameKey.isBlank()) byName.computeIfAbsent(nameKey, ignored -> new ArrayList<>()).add(staff);
    }

    for (UserAccount account : userRepo.findByStoreId(storeId)) {
      account.role = PermissionCatalog.normalizeRole(account.role);
      account.permissions = new LinkedHashSet<>(PermissionCatalog.effectivePermissions(account));
      Staff staff = account.staffId == null ? null : byId.get(account.staffId);
      if (staff == null) staff = staffRepo.findByUserAccountId(account.id).orElse(null);
      if (staff == null) staff = byEmail.get(normalizeEmail(account.email));
      if (staff == null) {
        List<Staff> sameName = byName.getOrDefault(normalizeName(account.fullName), List.of()).stream()
            .filter(candidate -> candidate.userAccountId == null)
            .toList();
        if (sameName.size() == 1) staff = sameName.get(0);
      }
      if (staff == null) {
        staff = new Staff();
        staff.id = PublicIdGenerator.next("NV", staffRepo.findAll(), 3);
        staff.storeId = storeId;
        staff.name = firstNonBlank(account.fullName, "Nhân viên");
        staff.role = displayRole(account.role);
        staff.phone = safe(account.phone);
        staff.email = safe(account.email);
        staff.avatar = account.avatar;
        staff.joinDate = LocalDate.now().toString();
        staff.status = "active";
        staff.orders = 0;
        staff.revenue = 0L;
        staff.salary = 0L;
        staffList.add(staff);
        byId.put(staff.id, staff);
        byName.computeIfAbsent(normalizeName(staff.name), ignored -> new ArrayList<>()).add(staff);
      }
      account.staffId = staff.id;
      userRepo.save(account);
      link(staff, account, staff.userAccountId == null || staff.loginEnabled == null ? true : staff.loginEnabled);
    }

    return staffRepo.findByStoreId(storeId);
  }

  @Transactional
  public void linkOwner(UserAccount account, Staff staff) {
    if (account == null || staff == null) return;
    account.role = "OWNER";
    account.staffId = staff.id;
    account.permissions = new LinkedHashSet<>(PermissionCatalog.allPermissions());
    userRepo.save(account);
    staff.loginEnabled = true;
    staff.userAccountId = account.id;
    staff.loginEmail = account.email;
    staff.systemRole = "OWNER";
    staff.accountStatus = "active";
    staff.permissions = new ArrayList<>(PermissionCatalog.allPermissions());
    staffRepo.save(staff);
  }

  private Staff normalizeStaff(Staff incoming, Staff existing, String storeId) {
    if (incoming == null) throw new IllegalArgumentException("Dữ liệu nhân viên không hợp lệ");
    Staff target = new Staff();
    target.storeId = storeId;
    target.name = required(firstNonBlank(incoming.name, existing == null ? null : existing.name), "Họ tên nhân viên không được để trống");
    target.role = firstNonBlank(incoming.role, existing == null ? null : existing.role, "Nhân viên");
    target.phone = safe(firstNonBlank(incoming.phone, existing == null ? null : existing.phone));
    target.email = normalizeEmail(firstNonBlank(incoming.email, existing == null ? null : existing.email));
    target.avatar = firstNonBlank(incoming.avatar, existing == null ? null : existing.avatar);
    target.department = firstNonBlank(incoming.department, existing == null ? null : existing.department);
    target.address = firstNonBlank(incoming.address, existing == null ? null : existing.address);
    target.salary = Math.max(0L, incoming.salary == null ? (existing == null || existing.salary == null ? 0L : existing.salary) : incoming.salary);
    target.startDate = firstNonBlank(incoming.startDate, existing == null ? null : existing.startDate);
    target.revenue = incoming.revenue == null ? (existing == null || existing.revenue == null ? 0L : existing.revenue) : Math.max(0L, incoming.revenue);
    target.orders = incoming.orders == null ? (existing == null || existing.orders == null ? 0 : existing.orders) : Math.max(0, incoming.orders);
    target.joinDate = firstNonBlank(incoming.joinDate, existing == null ? null : existing.joinDate, LocalDate.now().toString());
    target.status = normalizeStaffStatus(firstNonBlank(incoming.status, existing == null ? null : existing.status, "active"));

    target.loginEnabled = incoming.loginEnabled != null ? incoming.loginEnabled : existing != null && Boolean.TRUE.equals(existing.loginEnabled);
    target.userAccountId = existing == null ? null : existing.userAccountId;
    target.loginEmail = normalizeEmail(firstNonBlank(incoming.loginEmail, existing == null ? null : existing.loginEmail, target.email));
    target.systemRole = PermissionCatalog.normalizeRole(firstNonBlank(incoming.systemRole, existing == null ? null : existing.systemRole, roleFromJobTitle(target.role)));
    target.accountStatus = normalizeAccountStatus(firstNonBlank(incoming.accountStatus, existing == null ? null : existing.accountStatus, Boolean.TRUE.equals(target.loginEnabled) ? "active" : "inactive"));
    target.permissions = new ArrayList<>(PermissionCatalog.normalizeRequested(target.systemRole,
        incoming.permissions == null ? (existing == null ? List.of() : existing.permissions) : incoming.permissions));

    if (Boolean.TRUE.equals(target.loginEnabled)) {
      if (!EMAIL_PATTERN.matcher(target.loginEmail).matches()) throw new IllegalArgumentException("Email đăng nhập không hợp lệ");
      if (!"active".equals(target.status)) target.accountStatus = "inactive";
    } else {
      target.accountStatus = "inactive";
    }
    return target;
  }

  private UserAccount createAccountForStaff(Staff staff, String password) {
    String email = resolveLoginEmail(staff);
    ensureEmailAvailable(email, null);
    UserAccount account = new UserAccount();
    account.email = email;
    account.passwordHash = PasswordUtil.hash(password);
    account.fullName = staff.name;
    account.phone = safe(staff.phone);
    account.storeId = staff.storeId;
    applyStoreMetadata(account, staff.storeId);
    account.avatar = staff.avatar;
    account.avatarInitials = initials(staff.name);
    account.createdAt = now();
    account.status = accountStatusFor(staff);
    account.role = PermissionCatalog.normalizeRole(staff.systemRole);
    account.staffId = staff.id;
    account.permissions = new LinkedHashSet<>(PermissionCatalog.normalizeRequested(account.role, staff.permissions));
    return userRepo.save(account);
  }

  private void link(Staff staff, UserAccount account, boolean loginEnabled) {
    staff.loginEnabled = loginEnabled;
    staff.userAccountId = account.id;
    staff.loginEmail = account.email;
    staff.systemRole = PermissionCatalog.normalizeRole(account.role);
    staff.accountStatus = account.status;
    staff.permissions = new ArrayList<>(PermissionCatalog.effectivePermissions(account));
    staffRepo.save(staff);
  }

  private Optional<UserAccount> findLinkedAccount(Staff staff) {
    if (staff.userAccountId != null) {
      Optional<UserAccount> byId = userRepo.findById(staff.userAccountId);
      if (byId.isPresent() && Objects.equals(byId.get().storeId, staff.storeId)) return byId;
    }
    Optional<UserAccount> byStaff = userRepo.findByStaffId(staff.id);
    if (byStaff.isPresent() && Objects.equals(byStaff.get().storeId, staff.storeId)) return byStaff;
    String email = normalizeEmail(firstNonBlank(staff.loginEmail, staff.email));
    if (!email.isBlank()) return userRepo.findByEmail(email).filter(u -> Objects.equals(u.storeId, staff.storeId));
    return Optional.empty();
  }

  private boolean isOwner(Staff staff, UserAccount account) {
    return "OWNER".equals(PermissionCatalog.normalizeRole(account == null ? staff.systemRole : account.role));
  }

  private void ensureEmailAvailable(String email, Long currentAccountId) {
    userRepo.findByEmail(email).ifPresent(found -> {
      if (currentAccountId == null || !Objects.equals(found.id, currentAccountId)) {
        throw new IllegalArgumentException("Email đăng nhập đã được sử dụng bởi tài khoản khác");
      }
    });
  }

  private String resolveLoginEmail(Staff staff) {
    String email = normalizeEmail(firstNonBlank(staff.loginEmail, staff.email));
    if (!EMAIL_PATTERN.matcher(email).matches()) throw new IllegalArgumentException("Email đăng nhập không hợp lệ");
    return email;
  }

  private void applyStoreMetadata(UserAccount account, String storeId) {
    StoreInfo store = storeInfoRepo.findById(storeId).orElse(null);
    if (store != null) {
      account.storeName = firstNonBlank(store.name, account.storeName, "Cửa hàng của bạn");
      account.plan = firstNonBlank(store.plan, account.plan, "BefineSaaS");
    } else {
      account.storeName = firstNonBlank(account.storeName, "Cửa hàng của bạn");
      account.plan = firstNonBlank(account.plan, "BefineSaaS");
    }
    account.storeType = firstNonBlank(account.storeType, "retail");
  }

  private String accountStatusFor(Staff staff) {
    return Boolean.TRUE.equals(staff.loginEnabled)
        && "active".equalsIgnoreCase(safe(staff.status))
        && "active".equalsIgnoreCase(safe(staff.accountStatus)) ? "active" : "inactive";
  }

  private void ensureCanManageExisting(UserAccount actor, Staff staff, UserAccount account) {
    if (actor == null) throw new IllegalArgumentException("Vui lòng đăng nhập lại");
    String actorRole = PermissionCatalog.normalizeRole(actor.role);
    String targetRole = PermissionCatalog.normalizeRole(account == null ? staff.systemRole : account.role);
    if ("OWNER".equals(targetRole) && !"OWNER".equals(actorRole)) {
      throw new IllegalArgumentException("Chỉ chủ cửa hàng mới có thể cập nhật hồ sơ chủ cửa hàng");
    }
    if (!"OWNER".equals(actorRole) && roleRank(targetRole) >= roleRank(actorRole)) {
      throw new IllegalArgumentException("Bạn không thể cập nhật hoặc xoá tài khoản ngang hay cao hơn tài khoản của mình");
    }
  }

  private void validateDelegation(UserAccount actor, String targetRole, Collection<String> targetPermissions) {
    if (actor == null) throw new IllegalArgumentException("Vui lòng đăng nhập lại");
    String actorRole = PermissionCatalog.normalizeRole(actor.role);
    String normalizedTargetRole = PermissionCatalog.normalizeRole(targetRole);
    if (!"OWNER".equals(actorRole) && roleRank(normalizedTargetRole) >= roleRank(actorRole)) {
      throw new IllegalArgumentException("Bạn không thể tạo hoặc cấp vai trò ngang hay cao hơn tài khoản của mình");
    }
    Set<String> actorPermissions = PermissionCatalog.effectivePermissions(actor);
    Set<String> requested = PermissionCatalog.normalizeRequested(normalizedTargetRole, targetPermissions);
    if (!actorPermissions.containsAll(requested)) {
      throw new IllegalArgumentException("Bạn không thể cấp quyền mà tài khoản của mình không sở hữu");
    }
  }

  private static int roleRank(String role) {
    return switch (PermissionCatalog.normalizeRole(role)) {
      case "OWNER" -> 100;
      case "ADMIN" -> 90;
      case "MANAGER" -> 80;
      case "ACCOUNTANT", "WAREHOUSE", "SALES" -> 50;
      case "VIEWER" -> 10;
      default -> 0;
    };
  }

  private static String roleFromJobTitle(String jobTitle) {
    String role = safe(jobTitle).toUpperCase(Locale.ROOT);
    if (role.contains("CHỦ")) return "OWNER";
    if (role.contains("QUẢN LÝ")) return "MANAGER";
    if (role.contains("KHO")) return "WAREHOUSE";
    if (role.contains("KẾ TOÁN")) return "ACCOUNTANT";
    if (role.contains("CHỈ XEM")) return "VIEWER";
    return "SALES";
  }

  private static String displayRole(String role) {
    return switch (PermissionCatalog.normalizeRole(role)) {
      case "OWNER" -> "Chủ cửa hàng";
      case "ADMIN" -> "Quản trị viên";
      case "MANAGER" -> "Quản lý cửa hàng";
      case "WAREHOUSE" -> "Nhân viên kho";
      case "ACCOUNTANT" -> "Kế toán";
      case "VIEWER" -> "Chỉ xem";
      default -> "Nhân viên bán hàng";
    };
  }

  private static String normalizeStaffStatus(String value) {
    String status = safe(value).toLowerCase(Locale.ROOT);
    return Set.of("active", "on_leave", "inactive").contains(status) ? status : "active";
  }

  private static String normalizeAccountStatus(String value) {
    return "active".equalsIgnoreCase(safe(value)) ? "active" : "inactive";
  }

  private static String requirePassword(String password) {
    String value = safe(password);
    if (value.length() < 6) throw new IllegalArgumentException("Mật khẩu tạm thời phải có ít nhất 6 ký tự");
    return value;
  }

  private static String required(String value, String message) {
    String result = safe(value);
    if (result.isBlank()) throw new IllegalArgumentException(message);
    return result;
  }

  private static String normalizeEmail(String email) {
    return safe(email).toLowerCase(Locale.ROOT);
  }

  private static String normalizeName(String name) {
    return safe(name).toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
  }

  private static String firstNonBlank(String... values) {
    for (String value : values) if (value != null && !value.isBlank()) return value.trim();
    return "";
  }

  private static String safe(String value) {
    return value == null || "null".equalsIgnoreCase(value) ? "" : value.trim();
  }

  private static String now() {
    return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
  }

  private static String initials(String fullName) {
    String name = safe(fullName);
    if (name.isBlank()) return "U";
    String[] parts = name.split("\\s+");
    if (parts.length == 1) return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase(Locale.ROOT);
    return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase(Locale.ROOT);
  }
}
