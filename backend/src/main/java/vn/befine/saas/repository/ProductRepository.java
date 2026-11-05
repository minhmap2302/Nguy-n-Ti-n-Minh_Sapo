package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import vn.befine.saas.entity.Product;

public interface ProductRepository extends JpaRepository<Product, String> {
  List<Product> findByStoreId(String storeId);
  long countByStoreId(String storeId);
}
