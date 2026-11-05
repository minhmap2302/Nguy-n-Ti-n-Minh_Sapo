package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import vn.befine.saas.entity.Supplier;

public interface SupplierRepository extends JpaRepository<Supplier, String> {
  List<Supplier> findByStoreId(String storeId);
  long countByStoreId(String storeId);
}
