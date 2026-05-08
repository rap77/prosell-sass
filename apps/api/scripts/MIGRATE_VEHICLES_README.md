# Vehicle to Product Attributes Migration

## Overview

This script migrates all vehicle data from the `vehicles` table to the `products.attributes` JSONB column, transforming the data to match the `VehicleAttributes` Pydantic schema.

## Location

`apps/api/scripts/migrate_vehicles_to_product_attributes.py`

## Prerequisites

1. **Database running**: PostgreSQL must be accessible
2. **Vehicles exist**: The `vehicles` table should have data to migrate
3. **Products exist**: Each vehicle should have a corresponding `product_id` in the `products` table

## Usage

### Basic Usage

```bash
# Navigate to API directory
cd apps/api

# Dry run (RECOMMENDED FIRST - shows what would change)
DATABASE_URL="postgresql+asyncpg://prosell:prosell@localhost:5432/prosell" \
uv run python scripts/migrate_vehicles_to_product_attributes.py --dry-run

# Full migration
DATABASE_URL="postgresql+asyncpg://prosell:prosell@localhost:5432/prosell" \
uv run python scripts/migrate_vehicles_to_product_attributes.py
```

### With Options

```bash
# Custom batch size (useful for large datasets)
DATABASE_URL="postgresql+asyncpg://prosell:prosell@localhost:5432/prosell" \
uv run python scripts/migrate_vehicles_to_product_attributes.py \
  --batch-size 100

# Create backup table before migration (RECOMMENDED for production)
DATABASE_URL="postgresql+asyncpg://prosell:prosell@localhost:5432/prosell" \
uv run python scripts/migrate_vehicles_to_product_attributes.py \
  --backup

# Combine options
DATABASE_URL="postgresql+asyncpg://prosell:prosell@localhost:5432/prosell" \
uv run python scripts/migrate_vehicles_to_product_attributes.py \
  --backup \
  --batch-size 100
```

## What the Script Does

### 1. Data Analysis
- Counts total vehicles in the database
- Counts products that have corresponding vehicles
- Reports any discrepancies

### 2. Data Transformation
Transforms each `VehicleModel` record to `VehicleAttributes` schema:

```python
# From VehicleModel
{
    "vin": "2HGFC2F59KH534821",
    "year": 2019,
    "make": "Honda",
    "model": "Civic",
    "trim": "EX",
    "mileage": 45000,
    "has_sunroof": true,
    ...
}

# To ProductModel.attributes
{
    "category": "vehicle",           # Added discriminator
    "vin": "2HGFC2F59KH534821",      # Required: 17 chars
    "year": 2019,                     # Required
    "make": "Honda",                  # Required
    "model": "Civic",                 # Required
    "mileage": 45000.0,               # Required: float
    "trim": "EX",                     # Optional
    "has_sunroof": true,              # Optional: bool
    ...
}
```

### 3. Validation
- **VIN validation**: Must be exactly 17 characters
- **Pydantic validation**: All fields validated against `VehicleAttributes` schema
- **Type safety**: Ensures correct data types (e.g., mileage as float)

### 4. Migration
- Updates `products.attributes` JSONB column with transformed data
- Processes in batches to avoid memory issues
- Commits each batch independently

### 5. Verification
After migration, verifies:
- Products with `category: "vehicle"` in attributes
- Products missing category discriminator
- Products with invalid VIN (not 17 characters)

## Output Example

```
🚀 Starting vehicle to product attributes migration...
   Database: localhost:5432/prosell
   Batch size: 50
   Mode: DRY RUN

📊 Analyzing database...
   Found 150 vehicles
   Found 150 products with vehicles

📦 Processing batch 1 (50 vehicles)...
   ✅ Migrated: 50
📦 Processing batch 2 (50 vehicles)...
   ✅ Migrated: 100
📦 Processing batch 3 (50 vehicles)...
   ✅ Migrated: 150

============================================================
MIGRATION SUMMARY
============================================================
Mode: DRY RUN
Total vehicles: 150
Total products: 150
Migrated: 150
Failed: 0
============================================================
```

## Error Handling

The script handles errors gracefully:

- **Individual vehicle errors**: Logged and tracked, migration continues
- **Batch failures**: One vehicle failing doesn't stop the batch
- **Summary report**: Shows all errors at the end

Example error output:

```
❌ Errors (3):
   1. Vehicle abc-123: Invalid VIN: 2HGF (must be 17 characters)
   2. Vehicle def-456: Required field 'make' is missing
   3. Vehicle ghi-789: Validation error: year must be between 1900 and 2100
```

## Safety Features

### 1. Dry Run Mode
```bash
--dry-run
```
Shows what would be migrated without making any changes. **Always run this first!**

### 2. Backup Table
```bash
--backup
```
Creates a timestamped backup table before migration:
```sql
products_backup_20260505_143022
```

### 3. Batch Processing
Processes records in configurable batches (default: 50) to:
- Avoid memory issues with large datasets
- Allow progress tracking
- Enable partial recovery if migration fails

### 4. Rollback SQL
The script includes commented rollback SQL at the bottom for recovery if needed.

## Field Mapping

| VehicleModel Field | ProductModel.attributes Field | Notes |
|--------------------|-------------------------------|-------|
| `vin` | `vin` | Required, 17 chars, uppercased |
| `year` | `year` | Required, defaults to 2020 if missing |
| `make` | `make` | Required, defaults to "Unknown" if missing |
| `model` | `model` | Required, defaults to "Unknown" if missing |
| `trim` | `trim` | Optional |
| `body_type` | `body_type` | Optional |
| `drivetrain` | `drivetrain` | Optional |
| `transmission` | `transmission` | Optional |
| `engine` | `engine` | Optional |
| `fuel_type` | `fuel_type` | Optional |
| `mpg_city` | `mpg_city` | Optional |
| `mpg_highway` | `mpg_highway` | Optional |
| `mpg_combined` | `mpg_combined` | Optional |
| `mileage` | `mileage` | Required, converted to float, defaults to 0 |
| `mileage_unit` | `mileage_unit` | Optional, validated as "miles" or "km" |
| `exterior_color` | `exterior_color` | Optional |
| `interior_color` | `interior_color` | Optional |
| `has_sunroof` | `has_sunroof` | Optional, defaults to false |
| `has_navigation` | `has_navigation` | Optional, defaults to false |
| `has_leather` | `has_leather` | Optional, defaults to false |
| `has_backup_camera` | `has_backup_camera` | Optional, defaults to false |
| `has_bluetooth` | `has_bluetooth` | Optional, defaults to false |
| `has_remote_start` | `has_remote_start` | Optional, defaults to false |
| `seat_material` | `seat_material` | Optional |
| `stock_number` | `stock_number` | Optional |
| `vin_verified` | `vin_verified` | Optional, defaults to false |
| *(added)* | `category` | Always set to "vehicle" |

## Rollback Procedure

If you need to rollback the migration:

### Option 1: Restore from Backup (if --backup was used)

```sql
BEGIN;
  -- Find backup table name
  SELECT tablename FROM pg_tables 
  WHERE tablename LIKE 'products_backup_%' 
  ORDER BY tablename DESC 
  LIMIT 1;

  -- Drop current products table
  DROP TABLE products CASCADE;

  -- Rename backup to products
  ALTER TABLE products_backup_YYYYMMDD_HHMMSS RENAME TO products;

  -- Recreate indexes
  CREATE INDEX ix_products_attributes_gin ON products 
    USING gin (attributes jsonb_path_ops);
  CREATE INDEX ix_products_tenant_id ON products(tenant_id);
  CREATE INDEX ix_products_organization_id ON products(organization_id);
  CREATE INDEX ix_products_category_id ON products(category_id);
  CREATE INDEX ix_products_slug ON products(slug);
  CREATE INDEX ix_products_condition ON products(condition);
  CREATE INDEX ix_products_status ON products(status);
  CREATE INDEX ix_products_is_featured ON products(is_featured);
COMMIT;
```

### Option 2: Clear Attributes Only

```sql
-- Keep products, remove migrated attributes
UPDATE products 
SET attributes = '{}'::jsonb 
WHERE attributes->>'category' = 'vehicle';
```

## Troubleshooting

### Issue: "No vehicles found to migrate"
**Cause**: The `vehicles` table is empty.
**Solution**: Verify vehicles exist: `SELECT COUNT(*) FROM vehicles;`

### Issue: "Invalid VIN: must be 17 characters"
**Cause**: VIN in database is not 17 characters.
**Solution**: 
1. Run dry-run to see which vehicles have invalid VINs
2. Fix VINs in database: `UPDATE vehicles SET vin = '...' WHERE id = '...';`
3. Re-run migration

### Issue: "Required field 'make' is missing"
**Cause**: Vehicle has NULL make/model.
**Solution**: The script defaults to "Unknown", but if you want real data:
```sql
UPDATE vehicles 
SET make = 'Unknown', model = 'Unknown' 
WHERE make IS NULL OR model IS NULL;
```

### Issue: Migration is slow
**Cause**: Large dataset or small batch size.
**Solution**: Increase batch size:
```bash
--batch-size 200  # or higher
```

## Post-Migration Verification

After migration, verify in PostgreSQL:

```sql
-- Check products with vehicle category
SELECT COUNT(*) FROM products 
WHERE attributes->>'category' = 'vehicle';

-- Check for missing categories
SELECT COUNT(*) FROM products p
JOIN vehicles v ON p.id = v.product_id
WHERE p.attributes->>'category' IS NULL;

-- Check for invalid VINs
SELECT id, attributes->>'vin' as vin
FROM products
WHERE attributes->>'category' = 'vehicle'
AND LENGTH(attributes->>'vin') != 17;

-- Sample migrated data
SELECT 
    id,
    title,
    attributes->>'category' as category,
    attributes->>'vin' as vin,
    attributes->>'make' as make,
    attributes->>'model' as model,
    attributes->>'year' as year
FROM products
WHERE attributes->>'category' = 'vehicle'
LIMIT 5;
```

## Architecture Notes

### Async Processing
The script uses `asyncio` for all database operations, following the project's async-first pattern. No Celery or other task queues are used.

### Batch Processing
Vehicles are fetched and processed in batches to:
- Keep memory usage constant
- Provide progress feedback
- Allow partial recovery on failure

### Type Safety
All transformations use Pydantic v2 `VehicleAttributes` schema with strict validation:
```python
VehicleAttributes.model_validate(attrs)
```

### Error Handling
Individual vehicle failures don't stop the migration. All errors are:
- Logged with vehicle_id and product_id
- Tracked in MigrationStats
- Reported in final summary

## Related Files

- **DTO Schema**: `apps/api/src/prosell/application/dto/product/attributes.py`
- **Product Model**: `apps/api/src/prosell/infrastructure/models/product_model.py`
- **Vehicle Model**: `apps/api/src/prosell/infrastructure/models/vehicle_model.py`
- **Database Config**: `apps/api/src/prosell/core/config.py`

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the error messages in the migration summary
3. Verify database state with the post-migration verification queries
4. Check the script logs for detailed error information
