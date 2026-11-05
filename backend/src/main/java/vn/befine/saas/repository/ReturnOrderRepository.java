package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import vn.befine.saas.entity.ReturnOrder;

public interface ReturnOrderRepository extends JpaRepository<ReturnOrder, String> {
  List<ReturnOrder> findByStoreId(String storeId);
  long countByStoreId(String storeId);
}
