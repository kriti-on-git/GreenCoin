import { Schema, model, Document, Types } from 'mongoose';

export interface IUserStats extends Document {
  userId: Types.ObjectId;
  totalDevicesRecycled: number;
  totalWeightRecycled: number;
  totalReferrals: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userStatsSchema = new Schema<IUserStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    totalDevicesRecycled: {
      type: Number,
      default: 0,
    },
    totalWeightRecycled: {
      type: Number,
      default: 0,
    },
    totalReferrals: {
      type: Number,
      default: 0,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastActivityDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const UserStats = model<IUserStats>('UserStats', userStatsSchema, 'user_statistics');
