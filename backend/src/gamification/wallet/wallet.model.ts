import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  balance: number;
  lifetimeCoinsEarned: number;
  lifetimeCoinsRedeemed: number;
  pendingCoins: number;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  balance: { type: Number, required: true, default: 0 },
  lifetimeCoinsEarned: { type: Number, required: true, default: 0 },
  lifetimeCoinsRedeemed: { type: Number, required: true, default: 0 },
  pendingCoins: { type: Number, required: true, default: 0 }
}, {
  timestamps: true
});

export const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);
