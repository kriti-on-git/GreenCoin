import { Schema, model, Document, Types } from 'mongoose';

export interface IRewardRedemption extends Document {
  userId: Types.ObjectId;
  rewardId: string;
  rewardName: string;
  coinsCost: number;
  couponCode?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  fulfilledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rewardRedemptionSchema = new Schema<IRewardRedemption>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rewardId: {
      type: String,
      required: true,
    },
    rewardName: {
      type: String,
      required: true,
    },
    coinsCost: {
      type: Number,
      required: true,
    },
    couponCode: {
      type: String,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'EXPIRED'],
      default: 'PENDING',
    },
    fulfilledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const RewardRedemption = model<IRewardRedemption>('RewardRedemption', rewardRedemptionSchema, 'reward_redemptions');
