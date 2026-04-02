-- Seed test vehicles for staging E2E testing
-- This script creates sample vehicles for testing the inventory feature
-- Note: Uses the Phase 1/2 schema with products table

-- Insert test products first (vehicles are products in this schema)
WITH product_data AS (
    SELECT
        id,
        '68a2323a-0254-48a4-a2c1-9ff0e29269d9' as organization_id,  -- Admin's organization
        title,
        description,
        price_amount,
        NOW() as created_at,
        NOW() as updated_at
    FROM (VALUES
        (gen_random_uuid()::uuid, '2020 Honda Civic EX', 'Well-maintained Honda Civic with low miles. Features include Bluetooth, backup camera, and Honda Sensing safety suite.', 18500.00),
        (gen_random_uuid()::uuid, '2015 Toyota Corolla LE', 'Reliable Toyota Corolla LE. Great commuter car with excellent fuel economy. Clean title, one owner.', 14200.00),
        (gen_random_uuid()::uuid, '2019 Ford F-150 XLT', 'Powerful Ford F-150 XLT with 4WD. Tow package, bed liner, and leather interior. Ready for work or play.', 32000.00),
        (gen_random_uuid()::uuid, '2006 Mazda MX-5 Miata Grand Touring', 'Fun-to-drive Mazda MX-5 Miata convertible. Manual transmission, premium package, well maintained.', 12500.00),
        (gen_random_uuid()::uuid, '2010 Toyota Prius II', 'Fuel-efficient Toyota Prius hybrid. Great gas mileage, reliable, practical hatchback design.', 8500.00)
    ) AS p(id, title, description, price_amount)
),
inserted_products AS (
    INSERT INTO products (id, organization_id, title, description, price_amount, created_at, updated_at)
    SELECT * FROM product_data
    ON CONFLICT (id) DO NOTHING
    RETURNING id, title
)
-- Now insert vehicles linked to products
INSERT INTO vehicles (
    id,
    product_id,
    vin,
    year,
    make,
    model,
    trim,
    body_type,
    exterior_color,
    fuel_type,
    transmission,
    drivetrain,
    mileage,
    mileage_unit,
    has_backup_camera,
    has_bluetooth,
    has_leather,
    has_navigation,
    has_remote_start,
    has_sunroof,
    seat_material,
    vin_decoded_data,
    vin_verified,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    p.id,
    v.vin,
    v.year,
    v.make,
    v.model,
    v.trim,
    v.body_type,
    v.color,
    v.fuel_type,
    v.transmission,
    v.drivetrain,
    v.odometer,
    v.odometer_unit,
    v.has_backup_camera,
    v.has_bluetooth,
    v.has_leather,
    v.has_navigation,
    v.has_remote_start,
    v.has_sunroof,
    v.seat_material,
    '{}'::json,
    true,
    NOW(),
    NOW()
FROM inserted_products p
CROSS JOIN (VALUES
    ('1HGCM82633A123456', 2020, 'Honda', 'Civic', 'EX', 'Sedan', 'Blue', 'gasoline', 'automatic', 'FWD', 45000, 'mi', true, true, false, false, false, false, 'cloth'),
    ('2T1BURHE1FC123456', 2015, 'Toyota', 'Corolla', 'LE', 'Sedan', 'White', 'gasoline', 'automatic', 'FWD', 72000, 'mi', false, true, false, false, false, false, 'cloth'),
    ('1F1F15000MF123456', 2019, 'Ford', 'F-150', 'XLT', 'Pickup', 'Black', 'gasoline', 'automatic', '4WD', 60000, 'mi', true, true, true, false, false, false, 'leather'),
    ('JM1BK32G061123456', 2006, 'Mazda', 'MX-5 Miata', 'Grand Touring', 'Convertible', 'Red', 'gasoline', 'manual', 'RWD', 95000, 'mi', false, false, true, false, false, false, 'leather'),
    ('JTDKN3DU5A0123456', 2010, 'Toyota', 'Prius', 'II', 'Hatchback', 'Silver', 'hybrid', 'automatic', 'FWD', 120000, 'mi', true, true, false, false, false, false, 'cloth')
) AS v(vin, year, make, model, trim, body_type, color, fuel_type, transmission, drivetrain, odometer, odometer_unit, has_backup_camera, has_bluetooth, has_leather, has_navigation, has_remote_start, has_sunroof, seat_material)
WHERE p.title LIKE ('%' || v.make || '%' || v.model || '%')
ON CONFLICT (vin) DO NOTHING;

-- Display results
SELECT COUNT(*) as total_vehicles FROM vehicles;
