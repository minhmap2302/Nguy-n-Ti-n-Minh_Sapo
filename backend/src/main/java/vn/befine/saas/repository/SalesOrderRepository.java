package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import vn.befine.saas.entity.SalesOrder;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, String> {
  List<SalesOrder> findByStoreId(String storeId);
  long countByStoreId(String storeId);
}
