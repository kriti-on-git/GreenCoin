import { gamificationEventBus } from '../events/event-bus';
import { EventType, RewardCalculatedPayload, RewardRedeemedPayload } from '../events/event-types';
import { WalletService } from '../wallet/wallet.service';
import { dispatchEvent } from '../events/event-dispatcher';
import { logger } from '../../utils/logger';

export class WalletEngine {
  
  static initialize() {
    gamificationEventBus.on(EventType.REWARD_CALCULATED, WalletEngine.handleRewardCalculated);
    gamificationEventBus.on(EventType.REWARD_REDEEMED, WalletEngine.handleRewardRedeemed);
    logger.info('WalletEngine initialized');
  }

  static async handleRewardCalculated(payload: RewardCalculatedPayload) {
    try {
      const wallet = await WalletService.creditWallet(
        payload.userId,
        payload.coins,
        payload.reason,
        payload.referenceId
      );
      
      dispatchEvent(EventType.WALLET_UPDATED, {
        userId: payload.userId,
        timestamp: new Date(),
        newBalance: wallet.balance
      });
    } catch (error) {
      logger.error(`Error in WalletEngine.handleRewardCalculated: ${error}`);
    }
  }

  static async handleRewardRedeemed(payload: RewardRedeemedPayload) {
    try {
      const wallet = await WalletService.debitWallet(
        payload.userId,
        payload.cost,
        'REDEMPTION',
        payload.rewardId
      );
      
      dispatchEvent(EventType.WALLET_UPDATED, {
        userId: payload.userId,
        timestamp: new Date(),
        newBalance: wallet.balance
      });
    } catch (error) {
      logger.error(`Error in WalletEngine.handleRewardRedeemed: ${error}`);
    }
  }
}
