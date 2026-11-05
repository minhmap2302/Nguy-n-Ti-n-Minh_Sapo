package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import vn.befine.saas.entity.CashbookEntry;

public interface CashbookRepository extends JpaRepository<CashbookEntry, String> {
  List<CashbookEntry> findByStoreId(String storeId);
  long countByStoreId(String storeId);
}
