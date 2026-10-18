-- Draft migration. Not reviewed.
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  kind TEXT NOT NULL,
  value TEXT NOT NULL
);
INSERT INTO contacts (customer_id, kind, value)
  SELECT id, 'phone', phone FROM customers WHERE phone IS NOT NULL;
DROP TABLE customers;
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
