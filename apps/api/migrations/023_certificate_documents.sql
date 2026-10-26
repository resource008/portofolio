-- 023_certificate_documents.sql — daftar dokumen per pencapaian (URL kredensial
-- & file sertifikat dalam satu daftar campuran). Menggantikan kolom tunggal
-- credential_url & certificate_file pada tabel certificates.

CREATE TABLE IF NOT EXISTS certificate_documents (
    id SERIAL PRIMARY KEY,
    certificate_id INT NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
    document_value VARCHAR(500) NOT NULL,
    order_index INT NOT NULL DEFAULT 0
);

-- Salin data lama ke daftar baru: URL kredensial dulu, lalu file sertifikat.
INSERT INTO certificate_documents (certificate_id, document_value, order_index)
SELECT id, credential_url, 0
FROM certificates
WHERE credential_url IS NOT NULL AND credential_url <> '';

INSERT INTO certificate_documents (certificate_id, document_value, order_index)
SELECT id, certificate_file, 1
FROM certificates
WHERE certificate_file IS NOT NULL AND certificate_file <> '';

ALTER TABLE certificates DROP COLUMN IF EXISTS credential_url;
ALTER TABLE certificates DROP COLUMN IF EXISTS certificate_file;

CREATE INDEX IF NOT EXISTS idx_certificate_documents_certificate_id
ON certificate_documents (certificate_id);