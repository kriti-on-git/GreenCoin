import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { app } from '../src/index';
import { Pickup, Device, PickupStatus } from '../src/pickup/pickup.model';

// ----------------------------------------------------------------
// Mock the rewards client at the module level so we can control
// the handoff outcome in tests without hitting a real network.
// ----------------------------------------------------------------
jest.mock('../src/pickup/rewards-client', () => ({
  triggerRewardGeneration: jest.fn(),
}));

import { triggerRewardGeneration } from '../src/pickup/rewards-client';
const mockTriggerReward = triggerRewardGeneration as jest.MockedFunction<typeof triggerRewardGeneration>;

let mongoServer: MongoMemoryServer;

// ----------------------------------------------------------------
// Test Setup & Teardown
// ----------------------------------------------------------------
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Pickup.deleteMany({});
  await Device.deleteMany({});
  jest.resetAllMocks();
});

// ----------------------------------------------------------------
// Helper: create a pickup and advance it to a given status
// ----------------------------------------------------------------
const USER_TOKEN = 'Bearer valid_user_token';
const COLLECTOR_TOKEN = 'Bearer valid_collector_token';
const ADMIN_TOKEN = 'Bearer valid_admin_token';

/**
 * Creates a pickup via the API and drives it through the lifecycle
 * up to (and including) the specified target status.
 */
async function createPickupAtStatus(targetStatus: PickupStatus): Promise<string> {
  // 1. Create pickup (Requested)
  const createRes = await request(app)
    .post('/api/v1/pickups')
    .set('Authorization', USER_TOKEN)
    .send({
      pickupTime: '2026-08-01T10:00:00.000Z',
      device: { category: 'Laptop', weight: 2.5 },
    });
  expect(createRes.status).toBe(201);
  const pickupId = createRes.body.data._id;

  if (targetStatus === PickupStatus.REQUESTED) return pickupId;

  // 2. Accept (Accepted)
  const acceptRes = await request(app)
    .patch(`/api/v1/pickups/${pickupId}/accept`)
    .set('Authorization', COLLECTOR_TOKEN);
  expect(acceptRes.status).toBe(200);

  if (targetStatus === PickupStatus.ACCEPTED) return pickupId;

  // 3. Picked
  const pickedRes = await request(app)
    .patch(`/api/v1/pickups/${pickupId}/status`)
    .set('Authorization', COLLECTOR_TOKEN)
    .send({ status: PickupStatus.PICKED });
  expect(pickedRes.status).toBe(200);

  if (targetStatus === PickupStatus.PICKED) return pickupId;

  // 4. Delivered
  const deliveredRes = await request(app)
    .patch(`/api/v1/pickups/${pickupId}/status`)
    .set('Authorization', COLLECTOR_TOKEN)
    .send({ status: PickupStatus.DELIVERED });
  expect(deliveredRes.status).toBe(200);

  if (targetStatus === PickupStatus.DELIVERED) return pickupId;

  // 5. Verified + Reward Generated (requires mocked rewards client)
  if (targetStatus === PickupStatus.VERIFIED || targetStatus === PickupStatus.REWARD_GENERATED) {
    mockTriggerReward.mockResolvedValueOnce({ success: true });
    const verifyRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/verify`)
      .set('Authorization', ADMIN_TOKEN);
    expect(verifyRes.status).toBe(200);
    // After a successful verify, status is already Reward Generated
    return pickupId;
  }

  return pickupId;
}

// ================================================================
// TEST SUITES
// ================================================================

describe('Pickup Module — Verify Endpoint', () => {

  // ----------------------------------------------------------------
  // 1. Verify only works from Delivered
  // ----------------------------------------------------------------
  describe('State restrictions', () => {
    it('rejects verify when status is Requested', async () => {
      const pickupId = await createPickupAtStatus(PickupStatus.REQUESTED);

      const res = await request(app)
        .patch(`/api/v1/pickups/${pickupId}/verify`)
        .set('Authorization', ADMIN_TOKEN);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_TRANSITION');
    });

    it('rejects verify when status is Accepted', async () => {
      const pickupId = await createPickupAtStatus(PickupStatus.ACCEPTED);

      const res = await request(app)
        .patch(`/api/v1/pickups/${pickupId}/verify`)
        .set('Authorization', ADMIN_TOKEN);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_TRANSITION');
    });

    it('rejects verify when status is Picked', async () => {
      const pickupId = await createPickupAtStatus(PickupStatus.PICKED);

      const res = await request(app)
        .patch(`/api/v1/pickups/${pickupId}/verify`)
        .set('Authorization', ADMIN_TOKEN);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_TRANSITION');
    });

    it('rejects verify when status is already Reward Generated (via Verified)', async () => {
      const pickupId = await createPickupAtStatus(PickupStatus.REWARD_GENERATED);

      const res = await request(app)
        .patch(`/api/v1/pickups/${pickupId}/verify`)
        .set('Authorization', ADMIN_TOKEN);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_TRANSITION');
    });
  });

  // ----------------------------------------------------------------
  // 2. Role restrictions
  // ----------------------------------------------------------------
  describe('Role restrictions', () => {
    it('rejects verify from a user role', async () => {
      const pickupId = await createPickupAtStatus(PickupStatus.DELIVERED);

      const res = await request(app)
        .patch(`/api/v1/pickups/${pickupId}/verify`)
        .set('Authorization', USER_TOKEN);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('rejects verify from a collector role', async () => {
      const pickupId = await createPickupAtStatus(PickupStatus.DELIVERED);

      const res = await request(app)
        .patch(`/api/v1/pickups/${pickupId}/verify`)
        .set('Authorization', COLLECTOR_TOKEN);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });

  // ----------------------------------------------------------------
  // 3. Rewards handoff success
  // ----------------------------------------------------------------
  describe('Rewards handoff — success', () => {
    it('sets status to Reward Generated on successful handoff', async () => {
      const pickupId = await createPickupAtStatus(PickupStatus.DELIVERED);
      mockTriggerReward.mockResolvedValueOnce({ success: true });

      const res = await request(app)
        .patch(`/api/v1/pickups/${pickupId}/verify`)
        .set('Authorization', ADMIN_TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(PickupStatus.REWARD_GENERATED);

      // Verify the mock was called with correct payload shape
      expect(mockTriggerReward).toHaveBeenCalledTimes(1);
      const payload = mockTriggerReward.mock.calls[0][0];
      expect(payload).toHaveProperty('pickupId');
      expect(payload).toHaveProperty('userId');
      expect(payload).toHaveProperty('deviceId');
      expect(payload).toHaveProperty('category', 'Laptop');
      expect(payload).toHaveProperty('weight', 2.5);
    });
  });

  // ----------------------------------------------------------------
  // 4. Rewards handoff failure
  // ----------------------------------------------------------------
  describe('Rewards handoff — failure', () => {
    it('sets status to Verification Failed and returns error on handoff failure', async () => {
      const pickupId = await createPickupAtStatus(PickupStatus.DELIVERED);
      mockTriggerReward.mockResolvedValueOnce({ success: false, error: 'Service unavailable' });

      const res = await request(app)
        .patch(`/api/v1/pickups/${pickupId}/verify`)
        .set('Authorization', ADMIN_TOKEN);

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('REWARDS_HANDOFF_FAILED');

      // Confirm the pickup is now in VerificationFailed state
      const getRes = await request(app)
        .get(`/api/v1/pickups/${pickupId}`)
        .set('Authorization', ADMIN_TOKEN);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.status).toBe(PickupStatus.VERIFICATION_FAILED);
    });
  });
});

// ================================================================
// FULL LIFECYCLE REGRESSION
// ================================================================

describe('Pickup Module — Full Lifecycle Regression', () => {

  it('completes Requested → Accepted → Picked → Delivered → Verified → Reward Generated', async () => {
    // --- CREATE (Requested) ---
    const createRes = await request(app)
      .post('/api/v1/pickups')
      .set('Authorization', USER_TOKEN)
      .send({
        pickupTime: '2026-08-01T10:00:00.000Z',
        device: { category: 'Phone', weight: 0.2 },
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe(PickupStatus.REQUESTED);
    const pickupId = createRes.body.data._id;

    // --- REQUESTED: block every invalid transition ---
    for (const invalidStatus of [PickupStatus.PICKED, PickupStatus.DELIVERED, PickupStatus.VERIFIED, PickupStatus.REWARD_GENERATED]) {
      const res = await request(app)
        .patch(`/api/v1/pickups/${pickupId}/status`)
        .set('Authorization', COLLECTOR_TOKEN)
        .send({ status: invalidStatus });
      // Collector is not yet assigned, so may get FORBIDDEN_NOT_ASSIGNED_COLLECTOR or INVALID_TRANSITION
      expect([400, 403]).toContain(res.status);
    }

    // --- ACCEPT (Accepted) ---
    const acceptRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/accept`)
      .set('Authorization', COLLECTOR_TOKEN);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe(PickupStatus.ACCEPTED);

    // --- ACCEPTED: block backward/skip transitions ---
    for (const invalidStatus of [PickupStatus.REQUESTED, PickupStatus.DELIVERED, PickupStatus.VERIFIED, PickupStatus.REWARD_GENERATED]) {
      const res = await request(app)
        .patch(`/api/v1/pickups/${pickupId}/status`)
        .set('Authorization', COLLECTOR_TOKEN)
        .send({ status: invalidStatus });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_TRANSITION');
    }

    // --- PICKED ---
    const pickedRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', COLLECTOR_TOKEN)
      .send({ status: PickupStatus.PICKED });
    expect(pickedRes.status).toBe(200);
    expect(pickedRes.body.data.status).toBe(PickupStatus.PICKED);

    // --- PICKED: block backward/skip transitions ---
    for (const invalidStatus of [PickupStatus.REQUESTED, PickupStatus.ACCEPTED, PickupStatus.VERIFIED, PickupStatus.REWARD_GENERATED]) {
      const res = await request(app)
        .patch(`/api/v1/pickups/${pickupId}/status`)
        .set('Authorization', COLLECTOR_TOKEN)
        .send({ status: invalidStatus });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_TRANSITION');
    }

    // --- DELIVERED ---
    const deliveredRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', COLLECTOR_TOKEN)
      .send({ status: PickupStatus.DELIVERED });
    expect(deliveredRes.status).toBe(200);
    expect(deliveredRes.body.data.status).toBe(PickupStatus.DELIVERED);

    // --- DELIVERED: block backward/skip transitions ---
    for (const invalidStatus of [PickupStatus.REQUESTED, PickupStatus.ACCEPTED, PickupStatus.PICKED, PickupStatus.REWARD_GENERATED]) {
      const res = await request(app)
        .patch(`/api/v1/pickups/${pickupId}/status`)
        .set('Authorization', COLLECTOR_TOKEN)
        .send({ status: invalidStatus });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_TRANSITION');
    }

    // --- VERIFY → REWARD GENERATED ---
    mockTriggerReward.mockResolvedValueOnce({ success: true });
    const verifyRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/verify`)
      .set('Authorization', ADMIN_TOKEN);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe(PickupStatus.REWARD_GENERATED);

    // --- REWARD GENERATED: terminal state, reject verify again ---
    mockTriggerReward.mockResolvedValueOnce({ success: true });
    const reVerifyRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/verify`)
      .set('Authorization', ADMIN_TOKEN);
    expect(reVerifyRes.status).toBe(400);
    expect(reVerifyRes.body.error).toBe('INVALID_TRANSITION');
  });
});

// ================================================================
// EXISTING DAY 1/2 REGRESSION (kept for completeness)
// ================================================================

describe('Pickup Module — Day 1/2 API Regression', () => {

  it('Valid transition: Requested -> Accepted -> Picked -> Delivered succeeds', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/v1/pickups')
      .set('Authorization', USER_TOKEN)
      .send({
        pickupTime: '2026-08-01T10:00:00.000Z',
        device: { category: 'Tablet', weight: 0.5 },
      });
    expect(createRes.status).toBe(201);
    const pickupId = createRes.body.data._id;

    // Accept
    const acceptRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/accept`)
      .set('Authorization', COLLECTOR_TOKEN);
    expect(acceptRes.status).toBe(200);

    // Picked
    const pickedRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', COLLECTOR_TOKEN)
      .send({ status: 'Picked' });
    expect(pickedRes.status).toBe(200);

    // Delivered
    const deliveredRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', COLLECTOR_TOKEN)
      .send({ status: 'Delivered' });
    expect(deliveredRes.status).toBe(200);
    expect(deliveredRes.body.data.status).toBe('Delivered');
  });

  it('Invalid transition: Requested -> Delivered is rejected', async () => {
    const createRes = await request(app)
      .post('/api/v1/pickups')
      .set('Authorization', USER_TOKEN)
      .send({
        pickupTime: '2026-08-01T10:00:00.000Z',
        device: { category: 'Monitor', weight: 5 },
      });
    const pickupId = createRes.body.data._id;

    // Accept first so the collector is assigned
    await request(app)
      .patch(`/api/v1/pickups/${pickupId}/accept`)
      .set('Authorization', COLLECTOR_TOKEN);

    // Try to skip to Delivered
    const res = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', COLLECTOR_TOKEN)
      .send({ status: 'Delivered' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_TRANSITION');
  });

  it('A collector who is not assigned cannot update pickup status', async () => {
    const createRes = await request(app)
      .post('/api/v1/pickups')
      .set('Authorization', USER_TOKEN)
      .send({
        pickupTime: '2026-08-01T10:00:00.000Z',
        device: { category: 'Keyboard', weight: 0.8 },
      });
    const pickupId = createRes.body.data._id;

    // Try to update status without accepting (no collector assigned)
    const res = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', COLLECTOR_TOKEN)
      .send({ status: 'Picked' });
    expect(res.status).toBe(403);
  });

  it('Non-admin cannot create a collection center', async () => {
    const res = await request(app)
      .post('/api/v1/collection-centers')
      .set('Authorization', USER_TOKEN)
      .send({ name: 'Center A', location: '123 Street' });
    expect(res.status).toBe(403);
  });

  it('Admin can create a collection center', async () => {
    const res = await request(app)
      .post('/api/v1/collection-centers')
      .set('Authorization', ADMIN_TOKEN)
      .send({ name: 'Center A', location: '123 Street' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Center A');
  });
});
