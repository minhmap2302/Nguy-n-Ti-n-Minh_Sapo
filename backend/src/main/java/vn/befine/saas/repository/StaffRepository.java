package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import vn.befine.saas.entity.Staff;

public interface StaffRepository extends JpaRepository<Staff, String> {
  List<Staff> findByStoreId(String storeId);
  long countByStoreId(String storeId);
  Optional<Staff> findByUserAccountId(Long userAccountId);
  Optional<Staff> findByStoreIdAndLoginEmailIgnoreCase(String storeId, String loginEmail);
  Optional<Staff> findByStoreIdAndEmailIgnoreCase(String storeId, String email);
}
