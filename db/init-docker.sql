CREATE DATABASE latch_test;
CREATE ROLE latch_app WITH LOGIN PASSWORD 'latch_app_password' NOSUPERUSER NOBYPASSRLS;
\c latch_dev;
GRANT ALL PRIVILEGES ON SCHEMA public TO latch_app;
\c latch_test;
GRANT ALL PRIVILEGES ON SCHEMA public TO latch_app;

