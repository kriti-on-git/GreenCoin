import { Schema, model, Document } from 'mongoose';

export interface IActivityLog extends Document {
  userId: Schema.Types.ObjectId;
  eventType: string;
  payload: any;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const ActivityLog = model<IActivityLog>('ActivityLog', activityLogSchema, 'activity_logs');
