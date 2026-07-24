"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = require("../src/index");
const supertest_1 = __importDefault(require("supertest"));
async function run() {
    await mongoose_1.default.connect('mongodb://localhost:27017/gamification-smoke-test');
    await mongoose_1.default.connection.db?.dropDatabase();
    // Create user
    const registerRes = await (0, supertest_1.default)(index_1.app)
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
    const hashedPassword = await bcrypt_1.default.hash('password123', 10);
    const adminUser = new User_1.User({
        name: 'Admin User',
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true
    });
    await adminUser.save();
    const adminLoginRes = await (0, supertest_1.default)(index_1.app)
        .post('/api/v1/auth/login')
        .send({
        email: 'admin@test.com',
        password: 'password123'
    });
    const adminToken = adminLoginRes.body.token;
    // Create pickup
    const pickupRes = await (0, supertest_1.default)(index_1.app)
        .post('/api/v1/pickups')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
        pickupTime: new Date().toISOString(),
        device: { category: 'laptop', weight: 3.5 }
    });
    const pickupId = pickupRes.body.data._id;
    // Accept pickup (pretend admin is collector for a sec)
    await (0, supertest_1.default)(index_1.app)
        .put(`/api/v1/pickups/${pickupId}/accept`)
        .set('Authorization', `Bearer ${adminToken}`);
    // Transition to Delivered
    await (0, supertest_1.default)(index_1.app)
        .put(`/api/v1/pickups/${pickupId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Picked' });
    await (0, supertest_1.default)(index_1.app)
        .put(`/api/v1/pickups/${pickupId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });
    // Verify pickup (this should trigger gamification)
    const verifyRes = await (0, supertest_1.default)(index_1.app)
        .post(`/api/v1/pickups/${pickupId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);
    console.log('Verify pickup status:', verifyRes.status);
    // Wait a little for event bus async handlers
    await new Promise(r => setTimeout(r, 1000));
    // Check Wallet
    const walletRes = await (0, supertest_1.default)(index_1.app)
        .get('/api/v1/gamification/wallet')
        .set('Authorization', `Bearer ${userToken}`);
    console.log('Wallet:', walletRes.body.data);
    // Check Profile (XP)
    const profileRes = await (0, supertest_1.default)(index_1.app)
        .get('/api/v1/gamification/profile')
        .set('Authorization', `Bearer ${userToken}`);
    console.log('Profile:', profileRes.body.data);
    // Check Badges
    const badgesRes = await (0, supertest_1.default)(index_1.app)
        .get('/api/v1/gamification/badges')
        .set('Authorization', `Bearer ${userToken}`);
    console.log('Badges:', badgesRes.body.data);
    await mongoose_1.default.disconnect();
}
run().catch(console.error);
