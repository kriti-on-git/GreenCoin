import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greencoin';
  
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Database connected');
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};
