-- Migration 58: Add bureau (office) field for authorities

ALTER TABLE autorites ADD COLUMN IF NOT EXISTS bureau VARCHAR(255);
