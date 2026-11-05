package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import vn.befine.saas.entity.Customer;

public interface CustomerRepository extends JpaRepository<Customer, String> {
  List<Customer> findByStoreId(String storeId);
  long countByStoreId(String storeId);
}
