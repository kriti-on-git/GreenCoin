import mongoose from 'mongoose';
import { app } from '../src/index';
import request from 'supertest';
import { ChallengeEngine } from '../src/gamification/engine/challenge-engine';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/gamification-smoke-test');
  await mongoose.connection.db?.dropDatabase();
  
  // Create user
  const registerRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Smoke Test User',
      email: 'smoke@test.com',
      password: 'password123',
      role: 'user'
    });
  const userToken = registerRes.body.token;

  import { User } from '../src/models/User';
  import bcrypt from 'bcrypt';
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  const adminUser = new User({
    name: 'Admin User',
    email: 'admin@test.com',
    password: hashedPassword,
    role: 'admin',
    isVerified: true
  });
  await adminUser.save();

  const adminLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@test.com',
      password: 'password123'
    });
  const adminToken = adminLoginRes.body.token;

  // Create pickup
  const pickupRes = await request(app)
    .post('/api/v1/pickups')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      pickupTime: new Date().toISOString(),
      device: { category: 'laptop', weight: 3.5 }
    });
  const pickupId = pickupRes.body.data._id;

  // Accept pickup (pretend admin is collector for a sec)
  await request(app)
    .put(`/api/v1/pickups/${pickupId}/accept`)
    .set('Authorization', `Bearer ${adminToken}`);

  // Transition to Delivered
  await request(app)
    .put(`/api/v1/pickups/${pickupId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'Picked' });
  await request(app)
    .put(`/api/v1/pickups/${pickupId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'Delivered' });

  // Verify pickup (this should trigger gamification)
  const verifyRes = await request(app)
    .post(`/api/v1/pickups/${pickupId}/verify`)
    .set('Authorization', `Bearer ${adminToken}`);
  console.log('Verify pickup status:', verifyRes.status);
  
  // Wait a little for event bus async handlers
  await new Promise(r => setTimeout(r, 1000));

  // Check Wallet
  const walletRes = await request(app)
    .get('/api/v1/gamification/wallet')
    .set('Authorization', `Bearer ${userToken}`);
  console.log('Wallet:', walletRes.body.data);

  // Check Profile (XP)
  const profileRes = await request(app)
    .get('/api/v1/gamification/profile')
    .set('Authorization', `Bearer ${userToken}`);
  console.log('Profile:', profileRes.body.data);

  // Check Badges
  const badgesRes = await request(app)
    .get('/api/v1/gamification/badges')
    .set('Authorization', `Bearer ${userToken}`);
  console.log('Badges:', badgesRes.body.data);

  await mongoose.disconnect();
}

run().catch(console.error);
