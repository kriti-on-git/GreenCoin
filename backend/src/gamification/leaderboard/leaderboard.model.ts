import { Schema, model, Document } from 'mongoose';

export interface ILeaderboard extends Document {
  userId: Schema.Types.ObjectId;
  scope: 'global' | 'city' | 'college' | 'company' | 'campaign' | 'friends';
  score: number;
  rank: number;
  updatedAt: Date;
  createdAt: Date;
}

const leaderboardSchema = new Schema<ILeaderboard>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scope: {
      type: String,
      enum: ['global', 'city', 'college', 'company', 'campaign', 'friends'],
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// A user should only have one entry per scope
leaderboardSchema.index({ userId: 1, scope: 1 }, { unique: true });

// For efficient querying by scope and sorting by score
leaderboardSchema.index({ scope: 1, score: -1 });

export const Leaderboard = model<ILeaderboard>('Leaderboard', leaderboardSchema);
