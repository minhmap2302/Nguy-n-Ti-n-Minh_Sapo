package vn.befine.saas.util;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

/**
 * Generates the next human-readable public id from the highest existing suffix.
 * Using repository count() is unsafe after records are deleted because an old id
 * can be generated again. This helper scans existing ids and always advances the
 * highest numeric suffix instead.
 */
public final class PublicIdGenerator {
  private PublicIdGenerator() {}

  public static String next(String prefix, Iterable<?> entities, int digits) {
    return next(prefix, entities, digits, 0L);
  }

  public static synchronized String next(String prefix, Iterable<?> entities, int digits, long floor) {
    long max = Math.max(0L, floor);
    if (entities != null) {
      for (Object entity : entities) {
        String id = readId(entity);
        if (id == null || !id.startsWith(prefix)) continue;
        String suffix = id.substring(prefix.length()).replaceAll("\\D", "");
        if (suffix.isBlank()) continue;
        try {
          max = Math.max(max, Long.parseLong(suffix));
        } catch (NumberFormatException ignored) {
          // Ignore malformed legacy ids rather than failing a business request.
        }
      }
    }
    return prefix + String.format("%0" + Math.max(1, digits) + "d", max + 1L);
  }

  private static String readId(Object entity) {
    if (entity == null) return null;
    try {
      Field field = entity.getClass().getField("id");
      Object value = field.get(entity);
      return value == null ? null : String.valueOf(value);
    } catch (ReflectiveOperationException ignored) {
      try {
        Method getter = entity.getClass().getMethod("getId");
        Object value = getter.invoke(entity);
        return value == null ? null : String.valueOf(value);
      } catch (ReflectiveOperationException ignoredAgain) {
        return null;
      }
    }
  }
}
