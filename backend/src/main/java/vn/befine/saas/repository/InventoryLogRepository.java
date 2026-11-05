package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import vn.befine.saas.entity.InventoryLog;

public interface InventoryLogRepository extends JpaRepository<InventoryLog, String> {
  List<InventoryLog> findByStoreId(String storeId);
  long countByStoreId(String storeId);
}
