import { Schema, model, Document } from 'mongoose';

export interface IBadge extends Document {
  badgeId: string;
  name: string;
  description: string;
  tier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  iconUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const badgeSchema = new Schema<IBadge>(
  {
    badgeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    tier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    },
    iconUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Badge = model<IBadge>('Badge', badgeSchema);
