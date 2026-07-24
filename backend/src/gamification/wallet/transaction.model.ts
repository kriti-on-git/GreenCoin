import mongoose, { Document, Schema } from 'mongoose';

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  EXPIRY = 'expiry',
  BONUS = 'bonus',
  CAMPAIGN_REWARD = 'campaign_reward',
  REDEMPTION = 'redemption'
}

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  coins: number;
  reason: string;
  referenceId?: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: Object.values(TransactionType),
    required: true 
  },
  coins: { type: Number, required: true },
  reason: { type: String, required: true },
  referenceId: { type: String },
}, { timestamps: true });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema, 'wallet_transactions');
