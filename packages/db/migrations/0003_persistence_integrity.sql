DROP INDEX IF EXISTS idx_resources_cf;
CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_cf_type
  ON resources(account_id, type, cf_resource_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_zone_snapshots_resource_timestamp
  ON zone_snapshots(account_id, resource_id, timestamp);
