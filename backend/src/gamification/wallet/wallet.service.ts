import { Wallet, IWallet } from './wallet.model';
import { Transaction, TransactionType } from './transaction.model';
import { logger } from '../../utils/logger';

export class WalletService {
  
  static async getWallet(userId: string): Promise<IWallet> {
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({ userId });
    }
    // Ensure pendingCoins is initialized if dealing with old schemas
    if (wallet.pendingCoins === undefined) {
      wallet.pendingCoins = 0;
    }
    return wallet;
  }

  static async creditWallet(userId: string, coins: number, reason: string, referenceId?: string): Promise<IWallet> {
    if (coins <= 0) throw new Error('Coins must be positive');
    
    const wallet = await this.getWallet(userId);
    
    let type = TransactionType.CREDIT;
    if (reason.toLowerCase().includes('bonus')) type = TransactionType.BONUS;
    if (reason.toLowerCase().includes('campaign')) type = TransactionType.CAMPAIGN_REWARD;
    
    await Transaction.create({
      userId,
      type,
      coins,
      reason,
      referenceId
    });

    wallet.balance += coins;
    wallet.lifetimeCoinsEarned += coins;
    await wallet.save();
    
    logger.info(`Credited ${coins} to wallet for user ${userId}. Reason: ${reason}`);
    return wallet;
  }

  static async debitWallet(userId: string, coins: number, reason: string, referenceId?: string): Promise<IWallet> {
    if (coins <= 0) throw new Error('Coins must be positive');
    
    const wallet = await this.getWallet(userId);
    if (wallet.balance < coins) {
      const err: any = new Error('INSUFFICIENT_BALANCE');
      err.code = 'INSUFFICIENT_BALANCE';
      throw err;
    }
    
    let type = TransactionType.DEBIT;
    if (reason.toLowerCase().includes('redemption')) type = TransactionType.REDEMPTION;
    if (reason.toLowerCase().includes('expiry')) type = TransactionType.EXPIRY;

    await Transaction.create({
      userId,
      type,
      coins,
      reason,
      referenceId
    });

    wallet.balance -= coins;
    if (type === TransactionType.REDEMPTION) {
      wallet.lifetimeCoinsRedeemed += coins;
    }
    await wallet.save();
    
    logger.info(`Debited ${coins} from wallet for user ${userId}. Reason: ${reason}`);
    return wallet;
  }

  static async addPendingCoins(userId: string, coins: number, reason: string, referenceId?: string): Promise<IWallet> {
    if (coins <= 0) throw new Error('Coins must be positive');
    
    const wallet = await this.getWallet(userId);
    wallet.pendingCoins += coins;
    await wallet.save();

    await Transaction.create({
      userId,
      type: TransactionType.CREDIT, // Or create a PENDING type if desired
      coins,
      reason: `[PENDING] ${reason}`,
      referenceId,
    });
    
    logger.info(`Added ${coins} pending coins for user ${userId}. Reason: ${reason}`);
    return wallet;
  }

  static async resolvePendingCoins(userId: string, coins: number, approved: boolean, reason: string, referenceId?: string): Promise<IWallet> {
    if (coins <= 0) throw new Error('Coins must be positive');

    const wallet = await this.getWallet(userId);
    if (wallet.pendingCoins < coins) {
      throw new Error('Not enough pending coins to resolve');
    }

    wallet.pendingCoins -= coins;
    if (approved) {
      wallet.balance += coins;
      wallet.lifetimeCoinsEarned += coins;
      await Transaction.create({
        userId,
        type: TransactionType.CREDIT,
        coins,
        reason: `[APPROVED] ${reason}`,
        referenceId,
      });
      logger.info(`Resolved/Approved ${coins} pending coins for user ${userId}. Reason: ${reason}`);
    } else {
      await Transaction.create({
        userId,
        type: TransactionType.DEBIT,
        coins,
        reason: `[REJECTED] ${reason}`,
        referenceId,
      });
      logger.info(`Resolved/Rejected ${coins} pending coins for user ${userId}. Reason: ${reason}`);
    }

    await wallet.save();
    return wallet;
  }

  /**
   * Reconciliation function documented as a periodic consistency check.
   */
  static async recalculateBalance(userId: string): Promise<IWallet> {
    const wallet = await this.getWallet(userId);
    const transactions = await Transaction.find({ userId });
    
    let balance = 0;
    let lifetimeCoinsEarned = 0;
    let lifetimeCoinsRedeemed = 0;
    
    for (const tx of transactions) {
      if ([TransactionType.CREDIT, TransactionType.BONUS, TransactionType.CAMPAIGN_REWARD].includes(tx.type)) {
        balance += tx.coins;
        lifetimeCoinsEarned += tx.coins;
      } else if ([TransactionType.DEBIT, TransactionType.REDEMPTION, TransactionType.EXPIRY].includes(tx.type)) {
        balance -= tx.coins;
        if (tx.type === TransactionType.REDEMPTION) {
          lifetimeCoinsRedeemed += tx.coins;
        }
      }
    }
    
    wallet.balance = balance;
    wallet.lifetimeCoinsEarned = lifetimeCoinsEarned;
    wallet.lifetimeCoinsRedeemed = lifetimeCoinsRedeemed;
    await wallet.save();
    
    logger.info(`Recalculated balance for user ${userId}: ${balance}`);
    return wallet;
  }

  static async getTransactionHistory(userId: string, filters: { limit?: number, skip?: number } = {}) {
    const limit = filters.limit || 50;
    const skip = filters.skip || 0;
    
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Transaction.countDocuments({ userId });
    
    return {
      transactions,
      total,
      limit,
      skip
    };
  }
}
