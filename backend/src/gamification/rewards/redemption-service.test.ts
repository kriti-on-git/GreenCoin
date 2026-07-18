import mongoose from 'mongoose';
import { seedGamificationData } from '../seeder';
import { RedemptionService } from './redemption-service';
import { WalletService } from '../wallet/wallet.service';
import { Wallet } from '../wallet/wallet.model';
import { Transaction } from '../wallet/transaction.model';
import { dispatchEvent } from '../events/event-dispatcher';

jest.mock('../events/event-dispatcher', () => ({
  dispatchEvent: jest.fn()
}));

describe('RedemptionService', () => {
  const userId = 'test-user-redemption';

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gamification-test');
    await seedGamificationData();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Wallet.deleteMany({});
    await Transaction.deleteMany({});
    jest.clearAllMocks();
  });

  it('should reject if reward does not exist', async () => {
    await expect(RedemptionService.redeemReward(userId, 'INVALID_REWARD')).rejects.toThrow('REWARD_NOT_FOUND');
  });

  it('should reject if insufficient balance', async () => {
    await WalletService.creditWallet(userId, 100, 'Bonus');
    
    await expect(RedemptionService.redeemReward(userId, 'REWARD_AMAZON_VOUCHER_100')).rejects.toThrow('INSUFFICIENT_BALANCE');
  });

  it('should successfully redeem and debit wallet via event', async () => {
    await WalletService.creditWallet(userId, 1500, 'Bonus');
    
    const result = await RedemptionService.redeemReward(userId, 'REWARD_AMAZON_VOUCHER_100');
    expect(result.success).toBe(true);
    expect(result.reward.id).toBe('REWARD_AMAZON_VOUCHER_100');
    expect(result.fulfillment.couponCode).toBeDefined();

    const wallet = await Wallet.findOne({ userId });
    expect(wallet?.balance).toBe(500); // 1500 - 1000

    expect(dispatchEvent).toHaveBeenCalledWith(
      'REWARD_REDEEMED',
      expect.objectContaining({
        userId,
        rewardId: 'REWARD_AMAZON_VOUCHER_100',
        cost: 1000
      })
    );
  });
});
