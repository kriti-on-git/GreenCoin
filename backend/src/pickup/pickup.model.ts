import mongoose, { Schema, Document } from 'mongoose';

// ----------------------------------------
// Types & Enums
// ----------------------------------------

export enum PickupStatus {
  REQUESTED = 'Requested',
  ACCEPTED = 'Accepted',
  PICKED = 'Picked',
  DELIVERED = 'Delivered',
  VERIFIED = 'Verified',
  REWARD_GENERATED = 'Reward Generated',
  VERIFICATION_FAILED = 'Verification Failed'
}

export interface IDevice extends Document {
  category: string;
  weight: number;
}

export interface IPickup extends Document {
  status: PickupStatus;
  pickupTime: Date;
  userId: mongoose.Types.ObjectId;
  collectorId?: mongoose.Types.ObjectId;
  deviceId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICollectionCenter extends Document {
  name: string;
  location: string; // Storing as simple string based on diagram; consider GeoJSON for real app
}

// ----------------------------------------
// Schemas
// ----------------------------------------

const DeviceSchema = new Schema<IDevice>({
  category: { type: String, required: true },
  weight: { type: Number, required: true }
});

const PickupSchema = new Schema<IPickup>({
  status: {
    type: String,
    enum: Object.values(PickupStatus),
    default: PickupStatus.REQUESTED,
    required: true
  },
  pickupTime: { type: Date, required: true },
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  collectorId: { type: Schema.Types.ObjectId, ref: 'Collector' },
  deviceId: { type: Schema.Types.ObjectId, required: true, ref: 'Device' }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for fast querying
PickupSchema.index({ userId: 1 });
PickupSchema.index({ collectorId: 1 });
PickupSchema.index({ status: 1 });

const CollectionCenterSchema = new Schema<ICollectionCenter>({
  name: { type: String, required: true },
  location: { type: String, required: true }
});

// ----------------------------------------
// Models
// ----------------------------------------

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);
export const Pickup = mongoose.model<IPickup>('Pickup', PickupSchema);
export const CollectionCenter = mongoose.model<ICollectionCenter>('CollectionCenter', CollectionCenterSchema);
