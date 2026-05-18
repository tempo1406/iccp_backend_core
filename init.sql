-- Kiểm tra nếu database chưa tồn tại thì tạo mới
DO $$ 
BEGIN 
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${POSTGRE_DATABASE_NAME}') THEN 
      CREATE DATABASE ${POSTGRE_DATABASE_NAME}; 
   END IF; 
END $$;