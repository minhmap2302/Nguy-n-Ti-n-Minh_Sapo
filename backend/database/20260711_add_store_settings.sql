-- Chỉ cần chạy thủ công nếu spring.jpa.hibernate.ddl-auto không để là update.
ALTER TABLE store_info
  ADD COLUMN IF NOT EXISTS settings_json LONGTEXT NULL;
