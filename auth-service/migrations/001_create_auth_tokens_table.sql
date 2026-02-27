-- ============================================
-- 17. AUTH_TOKENS TABLE
-- ============================================
-- changeset AuthTokens:2026_02_08_01_00_00 splitStatements:false
-- comment: Store hashed refresh tokens for users/clients with expiry

CREATE TABLE IF NOT EXISTS auth_tokens (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    consignment_id BIGINT NOT NULL,
    client_id BIGINT NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    refresh_token_expires_at TIMESTAMP NOT NULL,
    access_token_jti VARCHAR(100) NOT NULL,
    access_token_expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by VARCHAR(100) DEFAULT 'SYSTEM',

    CONSTRAINT fk_auth_tokens_client FOREIGN KEY (client_id) REFERENCES auth_clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_auth_tokens_user FOREIGN KEY (consignment_id) REFERENCES consignment(id) ON DELETE CASCADE, 
    CONSTRAINT uk_auth_tokens_refresh_token UNIQUE (refresh_token_hash)
);

CREATE INDEX idx_auth_tokens_client_id ON auth_tokens(client_id);
CREATE INDEX idx_auth_tokens_consignment_id ON auth_tokens(consignment_id);
CREATE INDEX idx_auth_tokens_jti ON auth_tokens(access_token_jti);
CREATE INDEX idx_auth_tokens_is_revoked ON auth_tokens(is_revoked);

COMMENT ON TABLE auth_tokens IS 'Stores refresh tokens hashed, with access token metadata for OAuth2-like auth';
COMMENT ON COLUMN auth_tokens.refresh_token_hash IS 'Hashed refresh token for security';
COMMENT ON COLUMN auth_tokens.refresh_token_expires_at IS 'Expiry timestamp for refresh token (7 days)';
COMMENT ON COLUMN auth_tokens.access_token_jti IS 'Unique JWT ID for access token (short-lived, 2 hours)';
COMMENT ON COLUMN auth_tokens.access_token_expires_at IS 'Expiry timestamp for access token';
COMMENT ON COLUMN auth_tokens.is_revoked IS 'Indicates if the token has been revoked';
