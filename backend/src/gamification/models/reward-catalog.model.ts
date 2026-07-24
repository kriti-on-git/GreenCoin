import { Schema, model, Document } from 'mongoose';

export interface IRewardCatalog extends Document {
  rewardId: string;
  name: string;
  description: string;
  coinCost: number;
  stock?: number;
  type: 'VOUCHER' | 'DONATION' | 'PLANT_TREE' | 'CSR' | 'EVENT_TICKET' | 'PREMIUM_BADGE' | 'MERCHANDISE';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const rewardCatalogSchema = new Schema<IRewardCatalog>(
  {
    rewardId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    coinCost: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
    },
    type: {
      type: String,
      enum: ['VOUCHER', 'DONATION', 'PLANT_TREE', 'CSR', 'EVENT_TICKET', 'PREMIUM_BADGE', 'MERCHANDISE'],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const RewardCatalogModel = model<IRewardCatalog>('RewardCatalog', rewardCatalogSchema, 'reward_catalog');
