-- Add unique constraint to serial_number_imei in my_devices table, excluding empty strings
-- This ensures that no two entries have the same IMEI/Serial globally, but allows multiple empty values
CREATE UNIQUE INDEX IF NOT EXISTS unique_serial_number_imei_idx ON my_devices (serial_number_imei) WHERE (serial_number_imei IS NOT NULL AND serial_number_imei != '');
