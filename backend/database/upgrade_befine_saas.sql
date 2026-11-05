-- Chuẩn hóa dữ liệu dự án về BefineSaaS
-- Chạy trên database befine_saas hiện có. Không xóa dữ liệu.

USE befine_saas;

UPDATE store_info
SET plan = 'BefineSaaS'
WHERE id = 'store_befine_default'
  AND (plan IS NULL OR plan IN ('Befine Omni', 'BefineSaaS', 'BefineSaaS'));

UPDATE user_account
SET plan = 'BefineSaaS'
WHERE store_id = 'store_befine_default'
  AND (plan IS NULL OR plan IN ('Befine Omni', 'BefineSaaS', 'BefineSaaS'));

SELECT id, name, plan FROM store_info WHERE id = 'store_befine_default';
SELECT email, full_name, plan FROM user_account WHERE store_id = 'store_befine_default';
