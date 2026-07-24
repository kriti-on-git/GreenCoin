import mongoose from 'mongoose';
import { Pickup, Device, IPickup, IDevice, PickupStatus } from './pickup.model';
import { PickupStateMachine } from './pickup-state-machine';
import { triggerRewardGeneration } from './rewards-client';
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

    logger.info(`[createPickup] Saved pickup _id=${pickup._id}, fetching with populate...`);

    // 3. Re-fetch with populated device (more reliable than instance.populate)
    const populated = await Pickup.findById(pickup._id).populate('deviceId').exec();
    return populated!;
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
    return await pickup.populate('deviceId');
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
    return await pickup.populate('deviceId');
  }

  /**
   * Verifies a delivered pickup and triggers the Rewards module handoff.
   *
   * Flow:
   * 1. Validate Delivered → Verified transition via state machine
   * 2. Set status to Verified
   * 3. Call Rewards service with pickup/device data
   * 4. On success: transition to Reward Generated
   * 5. On failure: transition to Verification Failed, throw error
   */
  static async verifyPickup(pickupId: string): Promise<IPickup> {
    const pickup = await Pickup.findById(pickupId).populate<{ deviceId: IDevice }>('deviceId');
    if (!pickup) {
      const err: any = new Error('Pickup not found');
      err.statusCode = 404;
      err.errorCode = 'NOT_FOUND';
      throw err;
    }

    // 1. Validate transition: only Delivered → Verified is allowed
    try {
      PickupStateMachine.assertValidTransition(pickup.status, PickupStatus.VERIFIED);
    } catch (error: any) {
      logger.warn(`Invalid verify transition attempt for pickup ${pickupId} from status ${pickup.status}`, { error: error.message });
      throw error;
    }

    // 2. Transition to Verified
    pickup.status = PickupStatus.VERIFIED;
    await pickup.save();

    // 3. Build rewards payload from pickup + populated device
    const device = pickup.deviceId as unknown as IDevice;
    const rewardsPayload = {
      pickupId: pickupId,
      userId: pickup.userId.toString(),
      deviceId: device._id.toString(),
      category: device.category,
      weight: device.weight,
    };

    // 4. Call Rewards service
    const result = await triggerRewardGeneration(rewardsPayload);

    if (result.success) {
      // 5a. Success: transition Verified → Reward Generated
      PickupStateMachine.assertValidTransition(pickup.status, PickupStatus.REWARD_GENERATED);
      pickup.status = PickupStatus.REWARD_GENERATED;
      await pickup.save();

      logger.info(`Pickup ${pickupId} verified and reward triggered`);
      return await pickup.populate('deviceId');
    } else {
      // 5b. Failure: transition Verified → Verification Failed
      PickupStateMachine.assertValidTransition(pickup.status, PickupStatus.VERIFICATION_FAILED);
      pickup.status = PickupStatus.VERIFICATION_FAILED;
      await pickup.save();

      logger.error(`Rewards handoff failed for pickup ${pickupId}`, { reason: result.error });

      const err: any = new Error(`Rewards handoff failed: ${result.error}`);
      err.statusCode = 502;
      err.errorCode = 'REWARDS_HANDOFF_FAILED';
      throw err;
    }
  }
}

