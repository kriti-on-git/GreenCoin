import { Schema, model, Document, Types } from 'mongoose';

export interface IGamificationProfile extends Document {
  userId: Types.ObjectId;
  xp: number;
  level: number;
  totalCoinsEarned: number;
  totalCoinsRedeemed: number;
  badgeCount: number;
  challengesCompleted: number;
  createdAt: Date;
  updatedAt: Date;
}

const gamificationProfileSchema = new Schema<IGamificationProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    xp: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    totalCoinsEarned: {
      type: Number,
      default: 0,
    },
    totalCoinsRedeemed: {
      type: Number,
      default: 0,
    },
    badgeCount: {
      type: Number,
      default: 0,
    },
    challengesCompleted: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const GamificationProfile = model<IGamificationProfile>('GamificationProfile', gamificationProfileSchema, 'gamification_profiles');
