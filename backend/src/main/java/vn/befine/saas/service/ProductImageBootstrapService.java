package vn.befine.saas.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.befine.saas.entity.Product;
import vn.befine.saas.repository.ProductRepository;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class ProductImageBootstrapService {
  private static final Logger log = LoggerFactory.getLogger(ProductImageBootstrapService.class);
  private static final Pattern SEEDED_ID = Pattern.compile("P\\d{3}", Pattern.CASE_INSENSITIVE);

  private final ProductRepository productRepository;
  private final ObjectMapper objectMapper;

  @Value("${app.upload-dir:./uploads}")
  private String uploadDir;

  public ProductImageBootstrapService(ProductRepository productRepository, ObjectMapper objectMapper) {
    this.productRepository = productRepository;
    this.objectMapper = objectMapper;
  }

  @EventListener(ApplicationReadyEvent.class)
  @Transactional
  public void synchronizeSeedProductImages() {
    try {
      int copied = copyBundledImagesToUploadDirectory();
      int updated = attachImagesToExistingProducts();
      log.info("Product image bootstrap completed. Copied {} assets and updated {} product records.", copied, updated);
    } catch (Exception error) {
      // Không chặn backend khởi động chỉ vì lỗi ảnh. Classpath fallback trong
      // StaticResourceConfig vẫn có thể phục vụ ảnh đóng gói.
      log.warn("Product image bootstrap could not finish: {}", error.getMessage(), error);
    }
  }

  private int copyBundledImagesToUploadDirectory() throws Exception {
    Path targetDir = Path.of(uploadDir, "products", "seed").toAbsolutePath().normalize();
    Files.createDirectories(targetDir);
    int copied = 0;

    for (int index = 1; index <= 77; index++) {
      String code = String.format(Locale.ROOT, "P%03d", index);
      // JPG là ảnh thật lấy từ website Befine; PNG là thumbnail dự phòng.
      copied += copyIfPresent(code, "jpg", targetDir);
      copied += copyIfPresent(code, "png", targetDir);
    }

    copyManifestIfPresent(targetDir);
    return copied;
  }

  private int copyIfPresent(String code, String extension, Path targetDir) throws Exception {
    String classpathFile = "static/uploads/products/seed/" + code + "." + extension;
    ClassPathResource resource = new ClassPathResource(classpathFile);
    if (!resource.exists()) return 0;

    Path target = targetDir.resolve(code + "." + extension);
    // Đây là thư mục seed do ứng dụng quản lý, vì vậy luôn đồng bộ bản đóng gói
    // mới nhất. Ảnh người dùng upload nằm ngoài thư mục seed và không bị đụng tới.
    try (InputStream input = resource.getInputStream()) {
      Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
    }
    return 1;
  }

  private void copyManifestIfPresent(Path targetDir) {
    try {
      ClassPathResource resource = new ClassPathResource(
          "static/uploads/products/seed/official-image-sources.json");
      if (!resource.exists()) return;
      try (InputStream input = resource.getInputStream()) {
        Files.copy(input, targetDir.resolve("official-image-sources.json"),
            StandardCopyOption.REPLACE_EXISTING);
      }
    } catch (Exception error) {
      log.debug("Could not copy image source manifest: {}", error.getMessage());
    }
  }

  private int attachImagesToExistingProducts() throws Exception {
    Map<String, String> imageById = new HashMap<>();
    Map<String, String> imageBySku = new HashMap<>();

    JsonNode root = objectMapper.readTree(new ClassPathResource("seed-data.json").getInputStream());
    for (JsonNode node : root.withArray("products")) {
      String id = node.path("id").asText("").trim();
      String sku = node.path("sku").asText("").trim().toLowerCase(Locale.ROOT);
      String image = node.path("image").asText("").trim();
      if (!id.isBlank() && !image.isBlank()) imageById.put(id.toUpperCase(Locale.ROOT), image);
      if (!sku.isBlank() && !image.isBlank()) imageBySku.put(sku, image);
    }

    List<Product> products = productRepository.findAll();
    int updated = 0;

    for (Product product : products) {
      String current = product.image == null ? "" : product.image.trim();
      String id = product.id == null ? "" : product.id.trim().toUpperCase(Locale.ROOT);
      String sku = product.sku == null ? "" : product.sku.trim().toLowerCase(Locale.ROOT);

      String desired = imageById.get(id);
      if (desired == null) desired = imageBySku.get(sku);
      if (desired == null && SEEDED_ID.matcher(id).matches()) {
        desired = "/uploads/products/seed/" + id + ".png";
      }
      if (desired == null || desired.isBlank()) continue;

      boolean missing = current.isBlank();
      boolean sameManagedSeedAsset = isManagedSeedAssetForProduct(current, id);
      boolean desiredDiffers = !normalizePath(current).equalsIgnoreCase(normalizePath(desired));

      // Cập nhật DB cũ từ PNG/SVG placeholder sang JPG chính thức. Không đè ảnh
      // do người dùng tự upload vì ảnh đó không nằm ở đường dẫn seed của cùng ID.
      if (missing || (sameManagedSeedAsset && desiredDiffers)) {
        product.image = desired;
        updated++;
      }
    }

    if (updated > 0) productRepository.saveAll(products);
    return updated;
  }

  private boolean isManagedSeedAssetForProduct(String current, String id) {
    if (current == null || current.isBlank() || id == null || id.isBlank()) return false;
    String normalized = normalizePath(current);
    String regex = "(?i).*/uploads/products/seed/" + Pattern.quote(id)
        + "\\.(?:svg|png|jpg|jpeg|webp)(?:\\?.*)?$";
    return normalized.matches(regex);
  }

  private String normalizePath(String value) {
    return value == null ? "" : value.trim().replace('\\', '/');
  }
}
