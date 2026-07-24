import { Schema, model, Document } from 'mongoose';

export interface ILevel extends Document {
  level: number;
  xpRequired: number;
  title: string;
  unlocksDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const levelSchema = new Schema<ILevel>(
  {
    level: {
      type: Number,
      required: true,
      unique: true,
    },
    xpRequired: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    unlocksDescription: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Level = model<ILevel>('Level', levelSchema, 'levels');
