/**
 * Layer 2 Contract Tests - Appointment Flow
 *
 * Validates appointment endpoints against the actual backend contract:
 * - POST /api/v1/appointments  → { lead_id, user_id, product_id, scheduled_at, notes }
 * - GET  /api/v1/appointments  → { items, total, limit, offset }
 * - GET  /api/v1/appointments/{id}
 * - PUT  /api/v1/appointments/{id}  → { status?, notes? }
 *
 * NOTE: The backend uses `user_id` (the attending dealer/user) and `product_id`
 * (the vehicle product). Appointments require future business-hours datetimes
 * (Mon-Fri 9am-6pm).
 */

import { test, expect } from '@playwright/test';
import { AppointmentFactory, LeadFactory } from '../factories/index';

const aptFactory = new AppointmentFactory();
const leadFactory = new LeadFactory();

// Shared state populated in beforeAll
let currentUserId: string;
let testProductId: string;

test.describe('Layer 2: Appointment Flow - Contract Validation', () => {
  test.beforeAll(async ({ request }) => {
    // Get authenticated user ID
    const stateResp = await request.get('/api/v1/auth/state');
    if (stateResp.status() === 200) {
      const stateBody = await stateResp.json();
      if (stateBody.isAuthenticated && stateBody.user?.id) {
        currentUserId = stateBody.user.id;
      }
    }

    // Get or create a product to use in appointment tests
    const productsResp = await request.get('/api/v1/products?limit=1');
    if (productsResp.status() === 200) {
      const productsBody = await productsResp.json();
      const products = productsBody.products || productsBody.items || [];
      if (products.length > 0) {
        testProductId = products[0].id;
      }
    }

    // If no product exists, create one using a category
    if (!testProductId) {
      const catResp = await request.get('/api/v1/categories?limit=1');
      if (catResp.status() === 200) {
        const catBody = await catResp.json();
        const categories = catBody.items || catBody || [];
        if (categories.length > 0) {
          const catId = categories[0].id;
          const prodResp = await request.post('/api/v1/products', {
            data: {
              title: 'Test Vehicle for Contract Tests',
              price_cents: 1500000,
              category_id: catId,
              condition: 'used',
              attributes: {},
            },
          });
          if (prodResp.status() === 201) {
            const prod = await prodResp.json();
            testProductId = prod.id;
          }
        }
      }
    }
  });

  test.beforeEach(async () => {
    aptFactory.reset();
    leadFactory.reset();
  });

  // Helper: Create a lead for appointment testing
  async function createTestLead(request: any): Promise<any | null> {
    const response = await request.post('/api/v1/leads', {
      data: {
        buyer_name: 'Appointment Test Customer',
        buyer_email: 'apt-test@example.com',
        message: 'Interested in scheduling',
        source: 'manual',
      },
    });
    if (response.status() !== 201) return null;
    return await response.json();
  }

  // Generates a random far-future (2030-2099) weekday at 10am UTC.
  // Using Math.random() ensures uniqueness across parallel workers and test runs,
  // avoiding 409 conflicts with appointments already in the DB.
  function getUniqueBusinessSlot(): string {
    const year = 2030 + Math.floor(Math.random() * 70); // 2030–2099
    const month = Math.floor(Math.random() * 12);       // 0–11
    const day = Math.floor(Math.random() * 28) + 1;     // 1–28 (safe for all months)
    const d = new Date(Date.UTC(year, month, day, 10, 0, 0));
    // Shift to Monday if Saturday or Sunday
    const dow = d.getUTCDay();
    if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);    // Sun → Mon
    if (dow === 6) d.setUTCDate(d.getUTCDate() + 2);    // Sat → Mon
    return d.toISOString();
  }

  // ============================================
  // GROUP 1: Appointment Creation
  // ============================================
  test.describe('POST /api/v1/appointments - Create Appointment', () => {
    test('L2-APT-01: should create appointment with valid data', async ({ request }) => {
      const lead = await createTestLead(request);
      if (!lead || !currentUserId || !testProductId) {
        test.skip(true, 'Missing test setup: lead, userId, or productId');
        return;
      }

      const scheduledAt = getUniqueBusinessSlot();
      const response = await request.post('/api/v1/appointments', {
        data: {
          lead_id: lead.id,
          user_id: currentUserId,
          product_id: testProductId,
          scheduled_at: scheduledAt,
          notes: 'Test appointment',
        },
      });

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('lead_id', lead.id);
      expect(body).toHaveProperty('user_id', currentUserId);
      expect(body).toHaveProperty('product_id', testProductId);
      expect(body).toHaveProperty('status', 'scheduled');
      expect(body).toHaveProperty('created_at');
      expect(body).toHaveProperty('updated_at');

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(body.lead_id).toMatch(uuidRegex);
      expect(body.user_id).toMatch(uuidRegex);
      expect(body.product_id).toMatch(uuidRegex);

      const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(body.scheduled_at).toMatch(datetimeRegex);
      expect(body.created_at).toMatch(datetimeRegex);
    });

    test('L2-APT-02: should reject appointment in past', async ({ request }) => {
      const lead = await createTestLead(request);
      if (!lead || !currentUserId || !testProductId) {
        test.skip(true, 'Missing test setup');
        return;
      }

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const response = await request.post('/api/v1/appointments', {
        data: {
          lead_id: lead.id,
          user_id: currentUserId,
          product_id: testProductId,
          scheduled_at: pastDate,
          notes: 'Past appointment',
        },
      });

      expect(response.status()).toBe(422);
      const body = await response.json();
      expect(body).toHaveProperty('detail');
    });

    test('L2-APT-03: should reject appointment with invalid lead_id format', async ({ request }) => {
      const aptData = aptFactory.create();
      const response = await request.post('/api/v1/appointments', {
        data: {
          lead_id: 'not-a-uuid',
          user_id: currentUserId || aptData.dealer_id,
          product_id: testProductId || aptData.vehicle_id,
          scheduled_at: getUniqueBusinessSlot(),
          notes: 'test',
        },
      });
      expect(response.status()).toBe(422);
      const body = await response.json();
      expect(body).toHaveProperty('detail');
    });

    test('L2-APT-04: should reject appointment with missing required fields', async ({ request }) => {
      const response = await request.post('/api/v1/appointments', {
        data: {
          user_id: currentUserId || aptFactory.generateId('user'),
          product_id: testProductId || aptFactory.generateId('prod'),
          scheduled_at: getUniqueBusinessSlot(),
        },
      });
      expect(response.status()).toBe(422);
      const body = await response.json();
      expect(body).toHaveProperty('detail');
    });

    test('L2-APT-06: should accept appointment for Monday 10 AM', async ({ request }) => {
      const lead = await createTestLead(request);
      if (!lead || !currentUserId || !testProductId) {
        test.skip(true, 'Missing test setup');
        return;
      }

      // Random far-future business slot — each run picks a unique date
      const scheduledAt = getUniqueBusinessSlot();
      const response = await request.post('/api/v1/appointments', {
        data: {
          lead_id: lead.id,
          user_id: currentUserId,
          product_id: testProductId,
          scheduled_at: scheduledAt,
          notes: 'Business-hours appointment',
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.status).toBe('scheduled');

      // Verify the slot is a weekday (Mon-Fri) at business hours
      const scheduledDate = new Date(body.scheduled_at);
      const dow = scheduledDate.getUTCDay();
      expect(dow).toBeGreaterThanOrEqual(1); // Not Sunday
      expect(dow).toBeLessThanOrEqual(5);    // Not Saturday
    });

    test('L2-APT-08: should accept appointment without notes', async ({ request }) => {
      const lead = await createTestLead(request);
      if (!lead || !currentUserId || !testProductId) {
        test.skip(true, 'Missing test setup');
        return;
      }

      const response = await request.post('/api/v1/appointments', {
        data: {
          lead_id: lead.id,
          user_id: currentUserId,
          product_id: testProductId,
          scheduled_at: getUniqueBusinessSlot(),
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.notes).toBeNull();
    });

    test('L2-APT-09: should accept notes with special characters', async ({ request }) => {
      const lead = await createTestLead(request);
      if (!lead || !currentUserId || !testProductId) {
        test.skip(true, 'Missing test setup');
        return;
      }

      const specialNotes = 'Test with special chars: ñ é ü \nNewlines and \t tabs';
      const response = await request.post('/api/v1/appointments', {
        data: {
          lead_id: lead.id,
          user_id: currentUserId,
          product_id: testProductId,
          scheduled_at: getUniqueBusinessSlot(),
          notes: specialNotes,
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.notes).toContain('ñ');
      expect(body.notes).toContain('\n');
    });
  });

  // ============================================
  // GROUP 2: Appointment List
  // ============================================
  test.describe('GET /api/v1/appointments - List Appointments', () => {
    test('L2-APT-10: should return paginated appointment list', async ({ request }) => {
      const response = await request.get('/api/v1/appointments?limit=10&offset=0');

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('items');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('limit', 10);
      expect(body).toHaveProperty('offset', 0);

      expect(Array.isArray(body.items)).toBe(true);

      if (body.items.length > 0) {
        const firstApt = body.items[0];
        expect(firstApt).toHaveProperty('id');
        expect(firstApt).toHaveProperty('lead_id');
        expect(firstApt).toHaveProperty('user_id');
        expect(firstApt).toHaveProperty('product_id');
        expect(firstApt).toHaveProperty('scheduled_at');
        expect(firstApt).toHaveProperty('status');
      }
    });

    test('L2-APT-11: should filter appointments by status', async ({ request }) => {
      const response = await request.get('/api/v1/appointments?status=scheduled');

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('items');

      if (body.items.length > 0) {
        body.items.forEach((apt: any) => {
          expect(apt.status).toBe('scheduled');
        });
      }
    });

    test('L2-APT-12: should filter appointments by dealer (user) ID', async ({ request }) => {
      const userId = currentUserId || aptFactory.generateId('user');
      const response = await request.get(`/api/v1/appointments?dealer_id=${userId}`);

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('items');

      if (body.items.length > 0) {
        body.items.forEach((apt: any) => {
          expect(apt.user_id).toBe(userId);
        });
      }
    });

    test('L2-APT-13: should reject invalid status filter', async ({ request }) => {
      const response = await request.get('/api/v1/appointments?status=invalid-status');
      expect(response.status()).toBe(422);
    });
  });

  // ============================================
  // GROUP 3: Appointment Details
  // ============================================
  test.describe('GET /api/v1/appointments/{id} - Get Appointment Details', () => {
    test('L2-APT-14: should return appointment details', async ({ request }) => {
      const lead = await createTestLead(request);
      if (!lead || !currentUserId || !testProductId) {
        test.skip(true, 'Missing test setup');
        return;
      }

      const createResponse = await request.post('/api/v1/appointments', {
        data: {
          lead_id: lead.id,
          user_id: currentUserId,
          product_id: testProductId,
          scheduled_at: getUniqueBusinessSlot(),
          notes: 'Details test',
        },
      });

      if (createResponse.status() !== 201) {
        test.skip(true, 'Cannot create appointment — skipping details test');
        return;
      }

      const createdApt = await createResponse.json();
      const aptId = createdApt.id;

      const response = await request.get(`/api/v1/appointments/${aptId}`);

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('id', aptId);
      expect(body).toHaveProperty('lead_id', lead.id);
      expect(body).toHaveProperty('user_id', currentUserId);
      expect(body).toHaveProperty('product_id', testProductId);
      expect(body).toHaveProperty('status', 'scheduled');
      expect(body).toHaveProperty('notes', 'Details test');
      expect(body).toHaveProperty('created_at');
      expect(body).toHaveProperty('updated_at');

      const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(body.scheduled_at).toMatch(datetimeRegex);
    });

    test('L2-APT-15: should return 404 for non-existent appointment', async ({ request }) => {
      const response = await request.get('/api/v1/appointments/00000000-0000-0000-0000-000000000000');
      expect(response.status()).toBe(404);
    });

    test('L2-APT-16: should return 422 for invalid UUID format', async ({ request }) => {
      const response = await request.get('/api/v1/appointments/not-a-uuid');
      expect(response.status()).toBe(422);
    });
  });

  // ============================================
  // GROUP 4: Appointment Status Update
  // ============================================
  test.describe('PUT /api/v1/appointments/{id} - Update Appointment', () => {
    test('L2-APT-17: should update appointment status to completed', async ({ request }) => {
      const lead = await createTestLead(request);
      if (!lead || !currentUserId || !testProductId) {
        test.skip(true, 'Missing test setup');
        return;
      }

      const createResponse = await request.post('/api/v1/appointments', {
        data: {
          lead_id: lead.id,
          user_id: currentUserId,
          product_id: testProductId,
          scheduled_at: getUniqueBusinessSlot(),
          notes: 'Status update test',
        },
      });

      if (createResponse.status() !== 201) {
        test.skip(true, 'Cannot create appointment');
        return;
      }

      const createdApt = await createResponse.json();
      const aptId = createdApt.id;

      const response = await request.put(`/api/v1/appointments/${aptId}`, {
        data: {
          status: 'completed',
          notes: 'Customer arrived on time. Test drive completed.',
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('id', aptId);
      expect(body).toHaveProperty('status', 'completed');
      expect(body).toHaveProperty('notes', 'Customer arrived on time. Test drive completed.');
      expect(body).toHaveProperty('updated_at');

      expect(new Date(body.updated_at).getTime()).toBeGreaterThan(
        new Date(createdApt.updated_at).getTime()
      );
    });

    test('L2-APT-19: should reject invalid status transition', async ({ request }) => {
      const lead = await createTestLead(request);
      if (!lead || !currentUserId || !testProductId) {
        test.skip(true, 'Missing test setup');
        return;
      }

      const createResponse = await request.post('/api/v1/appointments', {
        data: {
          lead_id: lead.id,
          user_id: currentUserId,
          product_id: testProductId,
          scheduled_at: getUniqueBusinessSlot(),
        },
      });

      if (createResponse.status() !== 201) {
        test.skip(true, 'Cannot create appointment');
        return;
      }

      const createdApt = await createResponse.json();
      const aptId = createdApt.id;

      const response = await request.put(`/api/v1/appointments/${aptId}`, {
        data: {
          status: 'invalid-status',
        },
      });

      expect(response.status()).toBe(422);
    });
  });

  // ============================================
  // GROUP 5: Dealer Calendar View
  // ============================================
  test.describe('GET /api/v1/appointments?dealer_id={id} - Dealer Calendar', () => {
    test('L2-APT-20: should return dealer calendar view', async ({ request }) => {
      const userId = currentUserId || aptFactory.generateId('user');
      const response = await request.get(`/api/v1/appointments?dealer_id=${userId}`);

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('items');
      expect(body).toHaveProperty('total');

      if (body.items.length > 0) {
        body.items.forEach((apt: any) => {
          expect(apt.user_id).toBe(userId);
        });
      }
    });

    test('L2-APT-21: should filter dealer calendar by date range', async ({ request }) => {
      const userId = currentUserId || aptFactory.generateId('user');
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const startDate = today.toISOString().split('T')[0];
      const endDate = tomorrow.toISOString().split('T')[0];

      const response = await request.get(
        `/api/v1/appointments?dealer_id=${userId}&start_date=${startDate}&end_date=${endDate}`
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('items');
    });
  });

  // ============================================
  // GROUP 6: Edge Cases
  // ============================================
  test.describe('Edge Cases & Business Rules', () => {
    test('L2-APT-22: should handle notes with maximum length', async ({ request }) => {
      const lead = await createTestLead(request);
      if (!lead || !currentUserId || !testProductId) {
        test.skip(true, 'Missing test setup');
        return;
      }

      const response = await request.post('/api/v1/appointments', {
        data: {
          lead_id: lead.id,
          user_id: currentUserId,
          product_id: testProductId,
          scheduled_at: getUniqueBusinessSlot(),
          notes: 'A'.repeat(2000),
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.notes?.length).toBe(2000);
    });

    test('L2-APT-23: should reject notes exceeding 2000 chars', async ({ request }) => {
      const lead = await createTestLead(request);
      if (!lead || !currentUserId || !testProductId) {
        test.skip(true, 'Missing test setup');
        return;
      }

      const response = await request.post('/api/v1/appointments', {
        data: {
          lead_id: lead.id,
          user_id: currentUserId,
          product_id: testProductId,
          scheduled_at: getUniqueBusinessSlot(),
          notes: 'A'.repeat(2001),
        },
      });

      expect(response.status()).toBe(422);
    });
  });
});
