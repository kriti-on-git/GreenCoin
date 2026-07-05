import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/index';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PickupStatus, Pickup } from '../src/pickup/pickup.model';

let mongoServer: MongoMemoryReplSet;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear the database before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

describe('Pickup Module API Tests', () => {

  const userToken = 'Bearer valid_user_token';
  const collectorToken = 'Bearer valid_collector_token';
  const adminToken = 'Bearer valid_admin_token';

  it('Valid transition: Requested -> Accepted -> Picked -> Delivered succeeds', async () => {
    // 1. Create Pickup (Requested)
    const createRes = await request(app)
      .post('/api/v1/pickups')
      .set('Authorization', userToken)
      .send({
        pickupTime: new Date().toISOString(),
        device: { category: 'Laptop', weight: 2.5 }
      });
    expect(createRes.status).toBe(201);
    const pickupId = createRes.body.data._id;
    expect(createRes.body.data.status).toBe(PickupStatus.REQUESTED);

    // 2. Accept Pickup (Accepted)
    const acceptRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/accept`)
      .set('Authorization', collectorToken);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe(PickupStatus.ACCEPTED);
    const collectorId = acceptRes.body.data.collectorId;
    expect(collectorId).toBeTruthy();

    // 3. Update to Picked
    const pickRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', collectorToken)
      .send({ status: PickupStatus.PICKED });
    expect(pickRes.status).toBe(200);
    expect(pickRes.body.data.status).toBe(PickupStatus.PICKED);

    // 4. Update to Delivered
    const deliverRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', collectorToken)
      .send({ status: PickupStatus.DELIVERED });
    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.data.status).toBe(PickupStatus.DELIVERED);
  });

  it('Invalid transition: Requested -> Delivered is rejected', async () => {
    // 1. Create Pickup (Requested)
    const createRes = await request(app)
      .post('/api/v1/pickups')
      .set('Authorization', userToken)
      .send({
        pickupTime: new Date().toISOString(),
        device: { category: 'Laptop', weight: 2.5 }
      });
    const pickupId = createRes.body.data._id;

    // 2. Attempt to update directly to Delivered using status endpoint (will fail ownership anyway if not accepted, so let's mock it)
    // Actually, status endpoint requires collector ownership.
    const acceptRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/accept`)
      .set('Authorization', collectorToken);
    
    // Now status is ACCEPTED. Let's try to jump to DELIVERED
    const deliverRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', collectorToken)
      .send({ status: PickupStatus.DELIVERED });

    expect(deliverRes.status).toBe(400);
    expect(deliverRes.body.error).toBe('INVALID_TRANSITION');
  });

  it('Backward transition: Delivered -> Picked is rejected', async () => {
    // 1. Setup a pickup directly in the DB as Delivered
    const pickup = new Pickup({
      userId: new mongoose.Types.ObjectId('60d5ecb54cb7c1a361c8d8b1'),
      collectorId: new mongoose.Types.ObjectId('60d5ecb54cb7c1a361c8d8b2'),
      deviceId: new mongoose.Types.ObjectId(),
      pickupTime: new Date(),
      status: PickupStatus.DELIVERED
    });
    await pickup.save();

    // 2. Try to move backward to Picked
    const backwardRes = await request(app)
      .patch(`/api/v1/pickups/${pickup._id}/status`)
      .set('Authorization', collectorToken)
      .send({ status: PickupStatus.PICKED });

    expect(backwardRes.status).toBe(400);
    expect(backwardRes.body.error).toBe('INVALID_TRANSITION');
  });

  it('A collector who isn\'t assigned to a pickup cannot update its status', async () => {
    // 1. Setup a pickup directly in the DB assigned to someone else
    const pickup = new Pickup({
      userId: new mongoose.Types.ObjectId('60d5ecb54cb7c1a361c8d8b1'),
      collectorId: new mongoose.Types.ObjectId(), // Random collector ID
      deviceId: new mongoose.Types.ObjectId(),
      pickupTime: new Date(),
      status: PickupStatus.ACCEPTED
    });
    await pickup.save();

    // 2. Try to update status as the current token collector (60d5ecb54cb7c1a361c8d8b2)
    const updateRes = await request(app)
      .patch(`/api/v1/pickups/${pickup._id}/status`)
      .set('Authorization', collectorToken)
      .send({ status: PickupStatus.PICKED });

    expect(updateRes.status).toBe(403);
    expect(updateRes.body.error).toBe('FORBIDDEN_NOT_ASSIGNED_COLLECTOR');
  });

  it('Non-admin cannot create a collection center', async () => {
    const userRes = await request(app)
      .post('/api/v1/collection-centers')
      .set('Authorization', userToken)
      .send({ name: 'Center A', location: 'City' });
    expect(userRes.status).toBe(403);

    const collectorRes = await request(app)
      .post('/api/v1/collection-centers')
      .set('Authorization', collectorToken)
      .send({ name: 'Center A', location: 'City' });
    expect(collectorRes.status).toBe(403);

    const adminRes = await request(app)
      .post('/api/v1/collection-centers')
      .set('Authorization', adminToken)
      .send({ name: 'Center A', location: 'City' });
    expect(adminRes.status).toBe(201);
    expect(adminRes.body.data.name).toBe('Center A');
  });
});
