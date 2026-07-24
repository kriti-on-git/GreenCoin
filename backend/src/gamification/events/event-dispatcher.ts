import { gamificationEventBus } from './event-bus';
import { EventType, EventPayloadMap } from './event-types';
import { logger } from '../../utils/logger';

/**
 * Dispatches a gamification event.
 * This is the primary integration point for other modules (Pickup, Auth, etc.)
 * to send events into the Gamification Engine.
 *
 * @param eventName The type of event being dispatched.
 * @param payload The payload associated with the event.
 */
export function dispatchEvent<T extends EventType>(eventName: T, payload: EventPayloadMap[T]): void {
  logger.info(`Dispatching gamification event: ${eventName} for user: ${payload.userId}`);
  gamificationEventBus.emit(eventName, payload);
}
