import { Schema, model, Document, Types } from 'mongoose';

export interface IUserBadge extends Document {
  userId: Types.ObjectId;
  badgeId: string;
  earnedAt: Date;
}

const userBadgeSchema = new Schema<IUserBadge>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    badgeId: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
  }
);

// Ensure a user can only earn a specific badge once
userBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

export const UserBadge = model<IUserBadge>('UserBadge', userBadgeSchema, 'user_badges');
