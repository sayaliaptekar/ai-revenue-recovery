INSERT INTO merchants (name,email,password_hash)
VALUES ('Demo Merchant','merchant@demo.com','$2b$10$w6pM4rPj8wZgH2L5uW7J.eY2yZ6j8zJ7k0t9vYq2pWm8sZ4K8vWmG')
ON CONFLICT (email) DO NOTHING;

INSERT INTO customers (name,email,segment,lifetime_value,success_rate) VALUES
('Aarav Patil','aarav@example.com','HIGH_VALUE',85000,94),
('Riya Shah','riya@example.com','REGULAR',32000,87),
('Neha Joshi','neha@example.com','HIGH_VALUE',91000,91),
('Kabir More','kabir@example.com','REGULAR',18000,68),
('Anaya Kulkarni','anaya@example.com','VIP',145000,97),
('Om Deshmukh','om@example.com','REGULAR',22000,74);

INSERT INTO transactions (customer_id,amount,payment_method,status,failure_reason,attempt_count,created_at) VALUES
(1,9999,'CARD','failed','bank_declined',1,NOW()-INTERVAL '1 hour'),
(2,4999,'CARD','failed','card_expired',1,NOW()-INTERVAL '3 hours'),
(3,1499,'UPI','failed','technical_failure',1,NOW()-INTERVAL '5 hours'),
(4,7999,'CARD','failed','insufficient_funds',2,NOW()-INTERVAL '1 day'),
(5,24999,'CARD','failed','authentication_failure',1,NOW()-INTERVAL '1 day'),
(6,1999,'UPI','failed','bank_declined',2,NOW()-INTERVAL '2 days'),
(1,6999,'CARD','recovered',NULL,1, NOW()-INTERVAL '3 days'),
(3,12999,'CARD','recovered',NULL,1, NOW()-INTERVAL '4 days');

UPDATE transactions SET recovered_amount=amount WHERE status='recovered';
