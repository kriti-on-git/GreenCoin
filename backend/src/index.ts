import express from 'express';
import mongoose from 'mongoose';
import { errorHandler } from './middlewares/error.middleware';
import pickupRoutes from './pickup/pickup.routes';
import { logger } from './utils/logger';

import collectionCenterRoutes from './pickup/collection-center.routes';
import authRoutes from './auth/auth.routes';
import userRoutes from './users/user.routes';
import { connectDB } from './config/db';

const app = express();
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/pickups', pickupRoutes);
app.use('/api/v1/collection-centers', collectionCenterRoutes);

// Error Handling Middleware (must be the last middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greencoin';

export { app };

const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}
