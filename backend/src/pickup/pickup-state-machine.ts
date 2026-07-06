import { PickupStatus } from './pickup.model';

export class PickupStateMachine {
  /**
   * Defines the valid next states for each state.
   */
  private static readonly transitions: Record<PickupStatus, PickupStatus[]> = {
    [PickupStatus.REQUESTED]: [PickupStatus.ACCEPTED],
    [PickupStatus.ACCEPTED]: [PickupStatus.PICKED],
    [PickupStatus.PICKED]: [PickupStatus.DELIVERED],
    [PickupStatus.DELIVERED]: [PickupStatus.VERIFIED],
    [PickupStatus.VERIFIED]: [PickupStatus.REWARD_GENERATED, PickupStatus.VERIFICATION_FAILED],
    [PickupStatus.REWARD_GENERATED]: [], // Terminal state
    // TODO: Consider allowing VerificationFailed → Verified for manual retry
    [PickupStatus.VERIFICATION_FAILED]: [] // Terminal state — manual retry handled outside state machine
  };

  /**
   * Validates if a transition from currentStatus to nextStatus is valid.
   * @param currentStatus The current status of the pickup.
   * @param nextStatus The desired next status.
   * @returns boolean true if valid, false otherwise.
   */
  static isValidTransition(currentStatus: PickupStatus, nextStatus: PickupStatus): boolean {
    const allowedNextStates = this.transitions[currentStatus];
    if (!allowedNextStates) {
      return false;
    }
    return allowedNextStates.includes(nextStatus);
  }

  /**
   * Asserts that a transition is valid, throwing an error if it is not.
   * @param currentStatus The current status of the pickup.
   * @param nextStatus The desired next status.
   * @throws Error if the transition is invalid.
   */
  static assertValidTransition(currentStatus: PickupStatus, nextStatus: PickupStatus): void {
    if (!this.isValidTransition(currentStatus, nextStatus)) {
      const error: any = new Error(`Invalid status transition from '${currentStatus}' to '${nextStatus}'`);
      error.statusCode = 400;
      error.errorCode = 'INVALID_TRANSITION';
      throw error;
    }
  }
}
