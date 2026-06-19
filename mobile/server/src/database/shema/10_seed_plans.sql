INSERT INTO plans (id, name, price, interval, features) VALUES
('free', 'Gratuit', 0, 'month', '{"docs_per_type": 1, "objects": 2, "alerts": ["email"]}'),
('standard', 'Standard', 500, 'month', '{"docs_per_type": 1, "objects": 2, "alerts": ["email", "sms"], "geo": "basic"}'),
('pro', 'Pro', 1500, 'month', '{"docs_per_type": 3, "objects": 5, "alerts": ["email", "sms", "push"], "geo": "advanced"}'),
('vip', 'VIP', 3000, 'month', '{"docs_per_type": 5, "objects": 7, "alerts": ["all"], "geo": "advanced", "support": "priority"}')
ON CONFLICT (id) DO NOTHING;
