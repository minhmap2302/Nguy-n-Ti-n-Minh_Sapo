package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.befine.saas.entity.UserAccount;
import java.util.Optional;
import java.util.List;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
  Optional<UserAccount> findByEmail(String email);
  Optional<UserAccount> findByStaffId(String staffId);
  List<UserAccount> findByStoreId(String storeId);
}
