// Temporary in-memory storage for OTPs
// In production, use Redis or similar caching solution
const otpStorage = new Map();

export const storeOTP = (phone, otp, expiresAt) => {
  otpStorage.set(phone, { otp, expiresAt });
};

export const getOTP = (phone) => {
  return otpStorage.get(phone);
};

export const deleteOTP = (phone) => {
  return otpStorage.delete(phone);
};

export const isOTPExpired = (expiresAt) => {
  return Date.now() > expiresAt;
};