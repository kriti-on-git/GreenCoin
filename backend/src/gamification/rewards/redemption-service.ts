import { WalletService } from '../wallet/wallet.service';
import { RewardCatalogModel } from '../models/reward-catalog.model';
import { CouponService } from './coupon-service';
import { dispatchEvent } from '../events/event-dispatcher';
import { EventType } from '../events/event-types';
import { logger } from '../../utils/logger';

export class RedemptionService {
  static async redeemReward(userId: string, rewardId: string) {
    const reward = await RewardCatalogModel.findOne({ rewardId, isActive: true });
    if (!reward) {
      throw new Error('REWARD_NOT_FOUND');
    }

    // Direct synchronous check and debit (exception to pure pub/sub for consistency)
    const wallet = await WalletService.getWallet(userId);
    if (wallet.balance < reward.coinCost) {
      throw new Error('INSUFFICIENT_BALANCE');
    }

    // Debit wallet directly to prevent race conditions during redemption
    await WalletService.debitWallet(userId, reward.coinCost, `Redemption of ${reward.name}`, rewardId);

    // Emit event so other systems (like analytics) know redemption occurred
    await dispatchEvent(EventType.REWARD_REDEEMED, {
      userId,
      timestamp: new Date(),
      rewardId: reward.rewardId,
      cost: reward.coinCost
    });

    // Generate coupon or handle fulfillment
    let fulfillmentData: any = {};
    if (reward.type === 'VOUCHER') {
      fulfillmentData.couponCode = CouponService.generateCouponCode();
    } else if (reward.type === 'DONATION' || reward.type === 'PLANT_TREE') {
      fulfillmentData.status = 'PENDING_FULFILLMENT';
    }

    logger.info(`User ${userId} successfully redeemed reward ${rewardId}`);

    return {
      success: true,
      reward: {
        id: reward.rewardId,
        name: reward.name,
        description: reward.description,
        coinCost: reward.coinCost,
        type: reward.type
      },
      fulfillment: fulfillmentData
    };
  }
}
