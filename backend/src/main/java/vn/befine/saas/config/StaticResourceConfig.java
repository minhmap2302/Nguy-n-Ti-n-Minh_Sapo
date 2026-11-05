package vn.befine.saas.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {
  @Value("${app.upload-dir:./uploads}")
  private String uploadDir;

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    String externalLocation = Path.of(uploadDir).toAbsolutePath().normalize().toUri().toString();

    // Ưu tiên ảnh do người dùng upload ở thư mục ngoài. Nếu file chưa được copy
    // ra ngoài (ví dụ chạy lần đầu hoặc đổi working directory), Spring tự dùng
    // bản đóng gói trong classpath để ảnh seed vẫn hiển thị.
    registry.addResourceHandler("/uploads/**")
        .addResourceLocations(externalLocation + "/", "classpath:/static/uploads/")
        .setCacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic());
  }
}
