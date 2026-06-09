# Quick Start: Vehicle to Product Attributes Migration

## 🚀 Quick Start (3 Steps)

### 1. Dry Run (Do This First!)

```bash
cd apps/api

DATABASE_URL="postgresql+asyncpg://prosell:prosell@localhost:5432/prosell" \
uv run python scripts/migrate_vehicles_to_product_attributes.py --dry-run
```

### 2. Run Migration with Backup

```bash
DATABASE_URL="postgresql+asyncpg://prosell:prosell@localhost:5432/prosell" \
uv run python scripts/migrate_vehicles_to_product_attributes.py --backup
```

### 3. Verify Results

```bash
DATABASE_URL="postgresql+asyncpg://prosell:prosell@localhost:5432/prosell" \
uv run python scripts/verify_vehicle_migration.py
```

## 📊 What to Expect

**Dry Run Output**:

```
🚀 Starting vehicle to product attributes migration...
   Mode: DRY RUN

📊 Analyzing database...
   Found 150 vehicles
   Found 150 products with vehicles

📦 Processing batch 1 (50 vehicles)...
   ✅ Migrated: 50
...

============================================================
MIGRATION SUMMARY
============================================================
Mode: DRY RUN
Total vehicles: 150
Migrated: 150
Failed: 0
============================================================
```

**Verification Output**:

```
🔍 Verifying vehicle to product attributes migration...

1️⃣  Total vehicles: 150
2️⃣  Products with vehicle category: 150
3️⃣  Products missing category: 0
4️⃣  Products with invalid VIN: 0
5️⃣  Products missing make: 0
6️⃣  Products missing model: 0

============================================================
VERIFICATION SUMMARY
============================================================
✅ All checks passed!
   150 vehicles → 150 products migrated
============================================================
```

## 🔧 Custom Options

### Larger Batch Size

```bash
uv run python scripts/migrate_vehicles_to_product_attributes.py \
  --backup --batch-size 200
```

### Skip Backup (Not Recommended for Production)

```bash
uv run python scripts/migrate_vehicles_to_product_attributes.py
```

## 🛟 Rollback if Needed

```sql
-- Find backup table
SELECT tablename FROM pg_tables
WHERE tablename LIKE 'products_backup_%'
ORDER BY tablename DESC;

-- Restore from backup
BEGIN;
  DROP TABLE products CASCADE;
  ALTER TABLE products_backup_YYYYMMDD_HHMMSS RENAME TO products;
  -- Recreate indexes (see MIGRATE_VEHICLES_README.md)
COMMIT;
```

## 📚 Full Documentation

See `MIGRATE_VEHICLES_README.md` for:

- Complete field mapping
- Troubleshooting guide
- Safety features explanation
- Post-migration verification queries

## ⚠️ Important Notes

1. **Always run dry-run first** - See what will change without making changes
2. **Use --backup in production** - Creates timestamped backup table
3. **Check verification output** - Ensure all checks passed
4. **VIN validation** - All VINs must be exactly 17 characters
5. **Required fields** - make, model, year, mileage are required (defaults provided)

## 🆘 Troubleshooting

### "No vehicles found to migrate"

```sql
-- Check if vehicles exist
SELECT COUNT(*) FROM vehicles;
```

### "Invalid VIN: must be 17 characters"

```sql
-- Find invalid VINs
SELECT id, vin, LENGTH(vin) as vin_length
FROM vehicles
WHERE LENGTH(vin) != 17;
```

### "password authentication failed"

```bash
# Check DATABASE_URL format
export DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/dbname"
```

## ✅ Success Criteria

Migration is successful when:

- ✅ All vehicles migrated (Migrated count = Total vehicles)
- ✅ No failures (Failed: 0)
- ✅ Verification shows 0 missing categories
- ✅ Verification shows 0 invalid VINs
- ✅ All required fields present

---

**Time Estimate**: 5-10 minutes for 1000 vehicles
**Dependencies**: None (uses existing database)
**Risk Level**: Low (with --backup and dry-run)
