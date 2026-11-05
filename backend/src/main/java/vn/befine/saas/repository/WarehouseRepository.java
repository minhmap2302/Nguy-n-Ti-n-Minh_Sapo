package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import vn.befine.saas.entity.Warehouse;

public interface WarehouseRepository extends JpaRepository<Warehouse, String> {
  List<Warehouse> findByStoreId(String storeId);
  long countByStoreId(String storeId);
}
