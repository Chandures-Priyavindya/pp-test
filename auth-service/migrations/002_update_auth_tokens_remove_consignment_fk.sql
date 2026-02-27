-- ============================================
-- 2026-02-08: Update auth_tokens table
-- ============================================
-- changeset oauth2-client-creds:2026_02_08_01
-- comment: Remove consignment_id FK and make it nullable for OAuth2 client credentials flow

ALTER TABLE auth_tokens DROP CONSTRAINT IF EXISTS fk_auth_tokens_user;

ALTER TABLE auth_tokens ALTER COLUMN consignment_id DROP NOT NULL;

COMMENT ON COLUMN auth_tokens.consignment_id IS 'Optional: Reference to consignments for user-bound tokens. NULL for service-to-service (client credentials) authentication.';

-- rollback ALTER TABLE auth_tokens ALTER COLUMN consignment_id SET NOT NULL; ALTER TABLE auth_tokens ADD CONSTRAINT fk_auth_tokens_user FOREIGN KEY (consignment_id) REFERENCES consignments(consignment_id) ON DELETE CASCADE;
