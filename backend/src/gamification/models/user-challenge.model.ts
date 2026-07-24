import mongoose, { Schema, Document } from 'mongoose';

export interface IUserChallenge extends Document {
  userId: mongoose.Types.ObjectId;
  challengeId: string;
  progress: number;
  status: 'CREATED' | 'ASSIGNED' | 'STARTED' | 'ACTIVE' | 'COMPLETED' | 'REWARD_ISSUED';
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userChallengeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    challengeId: { type: String, required: true, index: true },
    progress: { type: Number, default: 0 },
    status: { type: String, enum: ['CREATED', 'ASSIGNED', 'STARTED', 'ACTIVE', 'COMPLETED', 'REWARD_ISSUED'], default: 'CREATED' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate active challenges
userChallengeSchema.index({ userId: 1, challengeId: 1 }, { unique: true });

export const UserChallenge = mongoose.model<IUserChallenge>('UserChallenge', userChallengeSchema, 'user_challenges');
