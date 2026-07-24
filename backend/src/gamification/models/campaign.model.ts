import { Schema, model, Document } from 'mongoose';

export interface ICampaign extends Document {
  campaignId: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  multiplier: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    campaignId: {
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
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    multiplier: {
      type: Number,
      required: true,
      min: 1,
      default: 1.0,
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

export const CampaignModel = model<ICampaign>('Campaign', campaignSchema);
