-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- UUID v7 helper function
-- Gera UUID v7 (time-ordered) compatível com RFC 9562
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  unix_ts_ms BIGINT;
  uuid_bytes BYTEA;
BEGIN
  unix_ts_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  uuid_bytes := set_byte(
    set_byte(
      decode(lpad(to_hex(unix_ts_ms), 12, '0') || encode(gen_random_bytes(10), 'hex'), 'hex'),
      6, (get_byte(decode(lpad(to_hex(unix_ts_ms), 12, '0') || encode(gen_random_bytes(10), 'hex'), 'hex'), 6) & 15) | 112
    ),
    8, (get_byte(decode(lpad(to_hex(unix_ts_ms), 12, '0') || encode(gen_random_bytes(10), 'hex'), 'hex'), 8) & 63) | 128
  );
  RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$;
