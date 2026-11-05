package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import vn.befine.saas.entity.PurchaseOrderEntity;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrderEntity, String> {
  List<PurchaseOrderEntity> findByStoreId(String storeId);
  long countByStoreId(String storeId);
}
