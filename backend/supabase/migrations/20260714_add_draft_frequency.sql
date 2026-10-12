-- Adds drafting-behavior support to tenants, alongside the existing auto_reply_level enum.
-- 'off' explicitly represents drafting disabled, mirroring how auto_reply_level uses 'never'.

CREATE TYPE draft_frequency AS ENUM ('off', 'most', 'average', 'less');

ALTER TABLE tenants
ADD COLUMN draft_frequency draft_frequency NOT NULL DEFAULT 'off';
