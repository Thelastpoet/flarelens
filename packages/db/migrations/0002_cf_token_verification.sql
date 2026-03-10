ALTER TABLE cf_tokens ADD COLUMN capabilities TEXT NOT NULL DEFAULT '[]';
ALTER TABLE cf_tokens ADD COLUMN verification_error TEXT;
ALTER TABLE cf_tokens ADD COLUMN verification_details TEXT NOT NULL DEFAULT '{}';
