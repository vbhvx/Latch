CREATE DATABASE latch_test;

-- Runtime role used by the API. NOBYPASSRLS + NOSUPERUSER means PostgreSQL row-level
-- security is enforced against the application, not just documented. Schema changes
-- run as the admin role (see the `migrate` service), never as this role.
CREATE ROLE latch_app WITH LOGIN PASSWORD 'latch_app_password' NOSUPERUSER NOBYPASSRLS;

\c latch_dev;
GRANT USAGE ON SCHEMA public TO latch_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO latch_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO latch_app;

\c latch_test;
GRANT USAGE ON SCHEMA public TO latch_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO latch_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO latch_app;
