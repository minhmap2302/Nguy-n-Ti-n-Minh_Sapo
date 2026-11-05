package vn.befine.saas.security;

import vn.befine.saas.entity.UserAccount;

import java.util.*;

/**
 * Central permission catalog shared by authentication, route protection and
 * account management. Permission keys are intentionally stable because the
 * frontend stores and sends these exact values.
 */
public final class PermissionCatalog {
  private PermissionCatalog() {}

  public static final String DASHBOARD_VIEW = "dashboard:view";
  public static final String POS_USE = "pos:use";
  public static final String ORDERS_VIEW = "orders:view";
  public static final String ORDERS_MANAGE = "orders:manage";
  public static final String RETURNS_VIEW = "returns:view";
  public static final String RETURNS_MANAGE = "returns:manage";
  public static final String PRODUCTS_VIEW = "products:view";
  public static final String PRODUCTS_MANAGE = "products:manage";
  public static final String INVENTORY_VIEW = "inventory:view";
  public static final String INVENTORY_MANAGE = "inventory:manage";
  public static final String PURCHASES_VIEW = "purchases:view";
  public static final String PURCHASES_MANAGE = "purchases:manage";
  public static final String SUPPLIERS_VIEW = "suppliers:view";
  public static final String SUPPLIERS_MANAGE = "suppliers:manage";
  public static final String CUSTOMERS_VIEW = "customers:view";
  public static final String CUSTOMERS_MANAGE = "customers:manage";
  public static final String PROMOTIONS_VIEW = "promotions:view";
  public static final String PROMOTIONS_MANAGE = "promotions:manage";
  public static final String CHANNELS_VIEW = "channels:view";
  public static final String CHANNELS_MANAGE = "channels:manage";
  public static final String CASHBOOK_VIEW = "cashbook:view";
  public static final String CASHBOOK_MANAGE = "cashbook:manage";
  public static final String REPORTS_VIEW = "reports:view";
  public static final String STAFF_VIEW = "staff:view";
  public static final String STAFF_MANAGE = "staff:manage";
  public static final String SETTINGS_VIEW = "settings:view";
  public static final String SETTINGS_MANAGE = "settings:manage";

  private static final LinkedHashSet<String> ALL = linkedSet(
      DASHBOARD_VIEW, POS_USE,
      ORDERS_VIEW, ORDERS_MANAGE,
      RETURNS_VIEW, RETURNS_MANAGE,
      PRODUCTS_VIEW, PRODUCTS_MANAGE,
      INVENTORY_VIEW, INVENTORY_MANAGE,
      PURCHASES_VIEW, PURCHASES_MANAGE,
      SUPPLIERS_VIEW, SUPPLIERS_MANAGE,
      CUSTOMERS_VIEW, CUSTOMERS_MANAGE,
      PROMOTIONS_VIEW, PROMOTIONS_MANAGE,
      CHANNELS_VIEW, CHANNELS_MANAGE,
      CASHBOOK_VIEW, CASHBOOK_MANAGE,
      REPORTS_VIEW,
      STAFF_VIEW, STAFF_MANAGE,
      SETTINGS_VIEW, SETTINGS_MANAGE
  );

  private static final Map<String, String> WRITE_TO_READ = Map.ofEntries(
      Map.entry(ORDERS_MANAGE, ORDERS_VIEW),
      Map.entry(RETURNS_MANAGE, RETURNS_VIEW),
      Map.entry(PRODUCTS_MANAGE, PRODUCTS_VIEW),
      Map.entry(INVENTORY_MANAGE, INVENTORY_VIEW),
      Map.entry(PURCHASES_MANAGE, PURCHASES_VIEW),
      Map.entry(SUPPLIERS_MANAGE, SUPPLIERS_VIEW),
      Map.entry(CUSTOMERS_MANAGE, CUSTOMERS_VIEW),
      Map.entry(PROMOTIONS_MANAGE, PROMOTIONS_VIEW),
      Map.entry(CHANNELS_MANAGE, CHANNELS_VIEW),
      Map.entry(CASHBOOK_MANAGE, CASHBOOK_VIEW),
      Map.entry(STAFF_MANAGE, STAFF_VIEW),
      Map.entry(SETTINGS_MANAGE, SETTINGS_VIEW)
  );

  public static String authority(String permission) {
    return "PERM_" + permission;
  }

  public static Set<String> allPermissions() {
    return new LinkedHashSet<>(ALL);
  }

  public static Set<String> defaultsForRole(String role) {
    return switch (normalizeRole(role)) {
      case "OWNER", "ADMIN" -> allPermissions();
      case "MANAGER" -> normalized(linkedSet(
          DASHBOARD_VIEW, POS_USE,
          ORDERS_MANAGE, RETURNS_MANAGE,
          PRODUCTS_MANAGE, INVENTORY_MANAGE,
          PURCHASES_MANAGE, SUPPLIERS_MANAGE,
          CUSTOMERS_MANAGE, PROMOTIONS_MANAGE,
          CHANNELS_MANAGE, CASHBOOK_MANAGE,
          REPORTS_VIEW, STAFF_MANAGE, SETTINGS_VIEW
      ));
      case "WAREHOUSE" -> normalized(linkedSet(
          DASHBOARD_VIEW,
          PRODUCTS_MANAGE, INVENTORY_MANAGE,
          PURCHASES_MANAGE, SUPPLIERS_MANAGE,
          ORDERS_VIEW
      ));
      case "ACCOUNTANT" -> normalized(linkedSet(
          DASHBOARD_VIEW,
          ORDERS_VIEW, RETURNS_VIEW,
          CUSTOMERS_VIEW, PURCHASES_VIEW, SUPPLIERS_VIEW,
          CASHBOOK_MANAGE, REPORTS_VIEW
      ));
      case "VIEWER" -> normalized(linkedSet(
          DASHBOARD_VIEW,
          ORDERS_VIEW, RETURNS_VIEW,
          PRODUCTS_VIEW, INVENTORY_VIEW,
          PURCHASES_VIEW, SUPPLIERS_VIEW,
          CUSTOMERS_VIEW, PROMOTIONS_VIEW,
          CHANNELS_VIEW, CASHBOOK_VIEW, REPORTS_VIEW
      ));
      default -> normalized(linkedSet(
          DASHBOARD_VIEW, POS_USE,
          ORDERS_MANAGE, RETURNS_MANAGE,
          PRODUCTS_VIEW, INVENTORY_VIEW,
          CUSTOMERS_MANAGE, PROMOTIONS_VIEW
      ));
    };
  }

  public static Set<String> effectivePermissions(UserAccount user) {
    if (user == null) return Set.of();
    String role = normalizeRole(user.role);
    if ("OWNER".equals(role)) return allPermissions();
    if (user.permissions == null || user.permissions.isEmpty()) return defaultsForRole(role);
    return normalized(user.permissions);
  }

  public static Set<String> normalizeRequested(String role, Collection<String> requested) {
    String normalizedRole = normalizeRole(role);
    if ("OWNER".equals(normalizedRole)) return allPermissions();
    if (requested == null || requested.isEmpty()) return defaultsForRole(normalizedRole);
    Set<String> normalized = normalized(requested);
    return normalized.isEmpty() ? defaultsForRole(normalizedRole) : normalized;
  }

  public static boolean has(UserAccount user, String permission) {
    return effectivePermissions(user).contains(permission);
  }

  public static String normalizeRole(String role) {
    String r = role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
    if (r.isBlank()) return "SALES";
    if (r.contains("OWNER") || r.contains("CHỦ")) return "OWNER";
    if (r.contains("ADMIN") || r.contains("QUẢN TRỊ")) return "ADMIN";
    if (r.contains("MANAGER") || r.contains("QUẢN LÝ")) return "MANAGER";
    if (r.contains("WAREHOUSE") || r.contains("KHO")) return "WAREHOUSE";
    if (r.contains("ACCOUNT") || r.contains("KẾ TOÁN")) return "ACCOUNTANT";
    if (r.contains("VIEW") || r.contains("CHỈ XEM")) return "VIEWER";
    if (r.contains("SALE") || r.contains("THU NGÂN") || r.contains("BÁN")) return "SALES";
    return Set.of("OWNER", "ADMIN", "MANAGER", "SALES", "WAREHOUSE", "ACCOUNTANT", "VIEWER").contains(r) ? r : "SALES";
  }

  private static Set<String> normalized(Collection<String> raw) {
    LinkedHashSet<String> result = new LinkedHashSet<>();
    for (String permission : Optional.ofNullable(raw).orElse(List.of())) {
      String p = permission == null ? "" : permission.trim().toLowerCase(Locale.ROOT);
      if ("*".equals(p)) return allPermissions();
      if (p.endsWith(":*")) {
        String module = p.substring(0, p.length() - 2);
        ALL.stream().filter(candidate -> candidate.startsWith(module + ":")).forEach(result::add);
      } else if (ALL.contains(p)) {
        result.add(p);
      }
    }
    WRITE_TO_READ.forEach((write, read) -> {
      if (result.contains(write)) result.add(read);
    });
    return result;
  }

  private static LinkedHashSet<String> linkedSet(String... values) {
    return new LinkedHashSet<>(Arrays.asList(values));
  }
}
