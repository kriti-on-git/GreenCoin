import { logger } from '../utils/logger';

/**
 * Payload shape for the Rewards service handoff.
 */
export interface RewardsPayload {
  pickupId: string;
  userId: string;
  deviceId: string;
  category: string;
  weight: number;
}

/**
 * Result of a rewards generation attempt.
 */
export interface RewardsResult {
  success: boolean;
  error?: string;
}

// TODO: Confirm the actual Rewards service URL with the Rewards team.
// Using placeholder POST /api/v1/rewards/generate for now.
const REWARDS_SERVICE_URL =
  process.env.REWARDS_SERVICE_URL || 'http://localhost:3001/api/v1/rewards/generate';

/**
 * Triggers reward generation by calling the Rewards service over HTTP.
 * Uses Node.js built-in fetch (Node 18+). No additional dependencies needed.
 *
 * Returns a result object instead of throwing, so the caller (service layer)
 * can decide how to handle failure (e.g. set VerificationFailed status).
 */
export async function triggerRewardGeneration(payload: RewardsPayload): Promise<RewardsResult> {
  try {
    const response = await fetch(REWARDS_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error(`Rewards service returned HTTP ${response.status}`, { body });
      return { success: false, error: `Rewards service returned HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    logger.error(`Rewards service call failed`, { error: error.message });
    return { success: false, error: error.message || 'Rewards service unreachable' };
  }
}
