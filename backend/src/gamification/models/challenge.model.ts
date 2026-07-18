import { Schema, model, Document } from 'mongoose';

export interface IChallenge extends Document {
  challengeId: string;
  name: string;
  description: string;
  criteria: {
    type: 'DEVICES_SCANNED' | 'WEIGHT_SUBMITTED' | 'STREAK_DAYS';
    targetCount?: number;
    targetWeight?: number;
  };
  rewardCoins: number;
  rewardBadgeId?: string;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const challengeSchema = new Schema<IChallenge>(
  {
    challengeId: {
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
    criteria: {
      type: {
        type: String,
        enum: ['DEVICES_SCANNED', 'WEIGHT_SUBMITTED', 'STREAK_DAYS'],
        required: true,
      },
      targetCount: {
        type: Number,
      },
      targetWeight: {
        type: Number,
      },
    },
    rewardCoins: {
      type: Number,
      required: true,
      min: 0,
    },
    rewardBadgeId: {
      type: String,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
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

export const ChallengeModel = model<IChallenge>('Challenge', challengeSchema);
