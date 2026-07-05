import mongoose from 'mongoose';
import { Pickup, Device, IPickup, IDevice, PickupStatus } from './pickup.model';
import { PickupStateMachine } from './pickup-state-machine';
import { logger } from '../utils/logger';

export class PickupService {
  /**
   * Creates a new pickup request along with its associated device.
   */
  static async createPickup(
    userId: string,
    pickupTime: string,
    deviceData: { category: string; weight: number }
  ): Promise<IPickup> {
    // 1. Create Device
    const device = new Device(deviceData);
    await device.save();

    // 2. Create Pickup linked to Device and User
    const pickup = new Pickup({
      userId: new mongoose.Types.ObjectId(userId),
      deviceId: device._id,
      pickupTime: new Date(pickupTime),
      status: PickupStatus.REQUESTED,
    });
    await pickup.save();

    return pickup.populate('deviceId');
  }

  /**
   * Fetches a single pickup by ID, populated with device information.
   */
  static async getPickupById(pickupId: string): Promise<IPickup | null> {
    return Pickup.findById(pickupId).populate('deviceId').exec();
  }

  /**
   * Lists pickups, optionally filtered by userId, collectorId, and status.
   */
  static async listPickups(filters: {
    userId?: string;
    collectorId?: string;
    status?: PickupStatus;
  }): Promise<IPickup[]> {
    const query: any = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.collectorId) query.collectorId = filters.collectorId;
    if (filters.status) query.status = filters.status;

    return Pickup.find(query)
      .populate('deviceId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Collector accepts a pickup.
   */
  static async acceptPickup(pickupId: string, collectorId: string): Promise<IPickup> {
    const pickup = await Pickup.findById(pickupId);
    if (!pickup) {
      const err: any = new Error('Pickup not found');
      err.statusCode = 404;
      err.errorCode = 'NOT_FOUND';
      throw err;
    }

    if (pickup.collectorId) {
      const err: any = new Error('Pickup is already assigned to a collector');
      err.statusCode = 403;
      err.errorCode = 'FORBIDDEN_ALREADY_ASSIGNED';
      throw err;
    }

    try {
      PickupStateMachine.assertValidTransition(pickup.status, PickupStatus.ACCEPTED);
    } catch (error: any) {
      logger.warn(`Invalid accept transition attempt for pickup ${pickupId}`, { error: error.message });
      throw error;
    }

    pickup.collectorId = new mongoose.Types.ObjectId(collectorId);
    pickup.status = PickupStatus.ACCEPTED;
    await pickup.save();
    
    logger.info(`Pickup ${pickupId} transitioned Requested -> Accepted by collector ${collectorId}`);
    return pickup.populate('deviceId');
  }

  /**
   * Collector updates the pickup status (Accepted -> Picked -> Delivered).
   */
  static async updatePickupStatus(pickupId: string, collectorId: string, nextStatus: PickupStatus): Promise<IPickup> {
    const pickup = await Pickup.findById(pickupId);
    if (!pickup) {
      const err: any = new Error('Pickup not found');
      err.statusCode = 404;
      err.errorCode = 'NOT_FOUND';
      throw err;
    }

    if (pickup.collectorId?.toString() !== collectorId) {
      const err: any = new Error('You are not assigned to this pickup');
      err.statusCode = 403;
      err.errorCode = 'FORBIDDEN_NOT_ASSIGNED_COLLECTOR';
      throw err;
    }

    const currentStatus = pickup.status;

    try {
      PickupStateMachine.assertValidTransition(currentStatus, nextStatus);
    } catch (error: any) {
      logger.warn(`Invalid transition attempt from ${currentStatus} to ${nextStatus} for pickup ${pickupId} by collector ${collectorId}`, { error: error.message });
      throw error;
    }

    pickup.status = nextStatus;
    await pickup.save();

    logger.info(`Pickup ${pickupId} transitioned ${currentStatus} -> ${nextStatus} by collector ${collectorId}`);
    return pickup.populate('deviceId');
  }
}
