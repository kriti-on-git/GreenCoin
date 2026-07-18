import crypto from 'crypto';

export class CouponService {
  /**
   * Generates a random alphanumeric coupon code.
   * TODO: This is a placeholder for real voucher API integration (e.g. Amazon/Flipkart API).
   */
  static generateCouponCode(length: number = 10): string {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
      .toUpperCase();
  }
}
