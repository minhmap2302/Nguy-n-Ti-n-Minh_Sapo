package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import vn.befine.saas.entity.SalesChannel;

public interface SalesChannelRepository extends JpaRepository<SalesChannel, String> {
  List<SalesChannel> findByStoreId(String storeId);
  long countByStoreId(String storeId);
}
