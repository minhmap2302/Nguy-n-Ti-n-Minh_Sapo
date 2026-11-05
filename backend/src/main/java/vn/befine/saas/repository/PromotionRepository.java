package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import vn.befine.saas.entity.Promotion;

public interface PromotionRepository extends JpaRepository<Promotion, String> {
  List<Promotion> findByStoreId(String storeId);
  long countByStoreId(String storeId);
}
