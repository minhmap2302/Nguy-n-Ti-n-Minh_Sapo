package vn.befine.saas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.befine.saas.entity.OrderItem;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {}
