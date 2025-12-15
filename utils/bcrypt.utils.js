import bcrypt from 'bcryptjs';

export const hashOTP = async (otp) => {
  const saltRounds = 10;
  return await bcrypt.hash(otp, saltRounds);
};

export const compareOTP = async (otp, hash) => {
  return await bcrypt.compare(otp, hash);
};