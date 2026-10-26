-- 004_certificate_organization.sql — add issuing organization to certificates.

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS organization VARCHAR(200);
