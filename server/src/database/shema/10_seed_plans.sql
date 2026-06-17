INSERT INTO plans (id, name, price, interval, features) VALUES
('free', 'Gratuit', 0, 'month', '{"docs_per_type": 1, "objects_limit": 2, "sms_alerts": false, "email_alerts": true, "geo_tracking": false, "priority_support": false, "verified_badge": false, "history_days": 30, "ads_free": false, "export_data": false}'),
('standard', 'Standard', 500, 'month', '{"docs_per_type": 1, "objects_limit": 2, "sms_alerts": true, "email_alerts": true, "geo_tracking": true, "priority_support": false, "verified_badge": false, "history_days": 30, "ads_free": false, "export_data": false}'),
('pro', 'Pro', 1500, 'month', '{"docs_per_type": 3, "objects_limit": 5, "sms_alerts": true, "email_alerts": true, "geo_tracking": true, "priority_support": true, "verified_badge": true, "history_days": 90, "ads_free": false, "export_data": false}'),
('vip', 'VIP', 3000, 'month', '{"docs_per_type": 5, "objects_limit": 7, "sms_alerts": true, "email_alerts": true, "geo_tracking": true, "priority_support": true, "verified_badge": true, "history_days": 365, "ads_free": true, "export_data": true}')
ON CONFLICT (id) DO NOTHING;
