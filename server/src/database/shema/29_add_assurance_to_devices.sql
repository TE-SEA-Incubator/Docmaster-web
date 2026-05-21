-- Migration: Add assurance flag to my_devices table
ALTER TABLE my_devices
ADD COLUMN IF NOT EXISTS assurance VARCHAR(10) DEFAULT 'non';