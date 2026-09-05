DROP TABLE IF EXISTS recovery_audit_logs;
DROP TABLE IF EXISTS recovery_actions;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS merchants;

CREATE TABLE merchants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  segment VARCHAR(30) NOT NULL,
  lifetime_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  success_rate NUMERIC(5,2) NOT NULL DEFAULT 70,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id),
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'failed',
  failure_reason VARCHAR(60),
  attempt_count INT NOT NULL DEFAULT 1,
  recovered_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recovery_actions (
  id SERIAL PRIMARY KEY,
  transaction_id INT NOT NULL REFERENCES transactions(id),
  recovery_score INT NOT NULL,
  priority VARCHAR(20) NOT NULL,
  recommended_action VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  personalized_message TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'recommended',
  fallback_action VARCHAR(50),
  root_cause VARCHAR(120),
  retry_at TIMESTAMP,
  autopilot_decision VARCHAR(30),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recovery_audit_logs (
  id SERIAL PRIMARY KEY,
  transaction_id INT REFERENCES transactions(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  recovery_probability NUMERIC(5,2),
  recommended_action VARCHAR(50),
  guardrail_result VARCHAR(30),
  execution_status VARCHAR(30),
  recovered_amount NUMERIC(12,2) DEFAULT 0,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recovery_actions_transaction
ON recovery_actions(transaction_id);

CREATE INDEX idx_recovery_actions_status
ON recovery_actions(status);

CREATE INDEX idx_audit_transaction
ON recovery_audit_logs(transaction_id);