import bcrypt from 'bcrypt';
import { User, IUser } from '../users/user.model';
import { generateToken } from './jwt.util';

const SALT_ROUNDS = 12;

export const hashPassword = async (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

export const comparePassword = async (plainPassword: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hash);
};

export const registerUser = async (name: string, email: string, password: string, role?: 'user' | 'collector' | 'admin') => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw { error: 'EMAIL_ALREADY_EXISTS' };
  }

  const passwordHash = await hashPassword(password);
  
  const [newUser] = await User.create([{
    name,
    email,
    passwordHash,
    role: role || 'user',
  }]);

  // Convert to object and remove passwordHash
  const userObj = newUser.toObject();
  delete (userObj as any).passwordHash;

  const token = generateToken({ id: userObj._id.toString(), role: userObj.role });

  return { user: userObj, token };
};

export const loginUser = async (email: string, password: string) => {
  // Explicitly select passwordHash
  const user = await User.findOne({ email }).select('+passwordHash');
  
  if (!user) {
    throw { error: 'INVALID_CREDENTIALS' };
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw { error: 'INVALID_CREDENTIALS' };
  }

  // Convert to object and remove passwordHash
  const userObj = user.toObject();
  delete (userObj as any).passwordHash;

  const token = generateToken({ id: userObj._id.toString(), role: userObj.role });

  return { user: userObj, token };
};
