import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(30);
    this.on('error', (err) => {
      logger.error('[GamificationEventBus] Error:', err);
    });
  }
}

// Export a singleton event bus for the Gamification Engine
export const gamificationEventBus = new EventBus();
