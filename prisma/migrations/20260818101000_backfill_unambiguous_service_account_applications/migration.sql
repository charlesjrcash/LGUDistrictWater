-- Link legacy records only when a customer has exactly one service application
-- and exactly one service account. Ambiguous histories remain intentionally null.
WITH unambiguous_links AS (
  SELECT c.customer_id,
         MIN(sa.application_id) AS application_id,
         MIN(acc.service_account_id) AS service_account_id
    FROM customers c
    JOIN service_applications sa ON sa.customer_id = c.customer_id
    JOIN service_accounts acc ON acc.customer_id = c.customer_id
   WHERE acc.application_id IS NULL
   GROUP BY c.customer_id
  HAVING COUNT(DISTINCT sa.application_id) = 1
     AND COUNT(DISTINCT acc.service_account_id) = 1
)
UPDATE service_accounts acc
   SET application_id = links.application_id
  FROM unambiguous_links links
 WHERE acc.service_account_id = links.service_account_id
   AND acc.application_id IS NULL;
