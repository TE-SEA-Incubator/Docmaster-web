ALTER TABLE declarations
  ADD COLUMN IF NOT EXISTS client_request_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS declarations_reporter_client_request_id_uidx
  ON declarations (reporter_id, client_request_id)
  WHERE client_request_id IS NOT NULL;
