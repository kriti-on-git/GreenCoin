import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

interface TokenPayload {
  id: string;
  role: string;
}

// Note: Keep JWT expiry at 1 hour for MVP. Refresh tokens are a deliberate Day-2
// descope per the team's roadmap and are intentionally not implemented here.
export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('INVALID_TOKEN');
  }
};
