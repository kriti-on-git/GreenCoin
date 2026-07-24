import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { app } from '../../src/index';
import { User } from '../../src/users/user.model';
import { generateToken } from '../../src/auth/jwt.util';

let mongoServer: MongoMemoryServer;
let userToken: string;
let adminToken: string;
let collectorToken: string;
let userId: string;
let adminId: string;
let collectorId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  
  const user = await User.create({ name: 'User', email: 'user@example.com', passwordHash: 'hash', role: 'user' });
  userId = user._id.toString();
  userToken = `Bearer ${generateToken({ id: userId, role: 'user' })}`;

  const admin = await User.create({ name: 'Admin', email: 'admin@example.com', passwordHash: 'hash', role: 'admin' });
  adminId = admin._id.toString();
  adminToken = `Bearer ${generateToken({ id: adminId, role: 'admin' })}`;

  const collector = await User.create({ name: 'Collector', email: 'collector@example.com', passwordHash: 'hash', role: 'collector' });
  collectorId = collector._id.toString();
  collectorToken = `Bearer ${generateToken({ id: collectorId, role: 'collector' })}`;
});

describe('User Profile Endpoints', () => {
  it('GET /api/v1/users/me with valid token -> 200, returns own profile without passwordHash', async () => {
    const res = await request(app).get('/api/v1/users/me').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('User');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('GET /api/v1/users/me without token -> 401', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('PATCH /api/v1/users/me updating name -> 200, name updated', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', userToken)
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('New Name');
  });

  it('PATCH /api/v1/users/me attempting to update email or role -> 400 FIELD_NOT_EDITABLE', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', userToken)
      .send({ name: 'New Name', email: 'new@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('FIELD_NOT_EDITABLE');
  });

  it('GET /api/v1/users/:id as non-admin -> 403 FORBIDDEN_ROLE', async () => {
    const res = await request(app).get(`/api/v1/users/${adminId}`).set('Authorization', userToken);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN_ROLE');
  });

  it('GET /api/v1/users/:id as admin -> 200, returns target user', async () => {
    const res = await request(app).get(`/api/v1/users/${userId}`).set('Authorization', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('User');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('GET /api/v1/users (list) as non-admin -> 403', async () => {
    const res = await request(app).get('/api/v1/users').set('Authorization', collectorToken);
    expect(res.status).toBe(403);
  });

  it('GET /api/v1/users?role=collector as admin -> 200, only collectors returned', async () => {
    const res = await request(app).get('/api/v1/users?role=collector').set('Authorization', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].role).toBe('collector');
  });
});
