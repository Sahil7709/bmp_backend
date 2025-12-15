import twilio from 'twilio';

// Initialize Twilio client with validation
let client = null;
let isInitialized = false;

// Function to initialize Twilio client after environment variables are loaded
export const initializeTwilio = () => {
  if (isInitialized) return;
  
  isInitialized = true;
    
  // Always simulate OTP for development/testing
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return;
  }
  
  // Check if Twilio credentials are available
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      console.log('Twilio client initialized successfully');
    } catch (error) {
      console.error('Error initializing Twilio client:', error.message);
      client = null;
    }
  } else {
    console.warn('Twilio credentials not found. SMS functionality will be simulated.');
  }
};

// Generate a random 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Validate phone number format
const isValidPhoneNumber = (phoneNumber) => {
  // Check if it's a valid E.164 format or Indian 10-digit format
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  const indianMobileRegex = /^[6-9]\d{9}$/; // Indian mobile numbers start with 6-9 and are 10 digits
  return e164Regex.test(phoneNumber) || indianMobileRegex.test(phoneNumber);
};

// Send OTP via Twilio SMS or simulate if credentials are missing
export const sendOTP = async (phoneNumber, otp) => {
  try {
    // Validate phone number format
    if (!isValidPhoneNumber(phoneNumber)) {
      console.log(`Invalid phone number format: ${phoneNumber}. Falling back to simulated OTP.`);
      // Simulate sending OTP for invalid numbers
      console.log(`SIMULATED: OTP ${otp} would be sent to ${phoneNumber}`);
      return { success: true, message: 'OTP sent successfully (simulated)', messageId: 'simulated' };
    }
    
    // Format phone number for Indian numbers
    let formattedPhoneNumber = phoneNumber;
    if (/^[6-9]\d{9}$/.test(phoneNumber)) {
      // Add country code for Indian numbers
      formattedPhoneNumber = `+91${phoneNumber}`;
    } else if (phoneNumber.startsWith('+')) {
      formattedPhoneNumber = phoneNumber;
    } else {
      formattedPhoneNumber = `+${phoneNumber}`;
    }
    
    // Always simulate in development mode, otherwise use Twilio if configured
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || !client) {
      console.log(`SIMULATED: OTP ${otp} would be sent to ${formattedPhoneNumber}`);
      // In a real application, you might want to log this to a database or send via email
      return { success: true, message: 'OTP sent successfully (simulated)', messageId: 'simulated' };
    }
    
    const message = await client.messages.create({
      body: `Your Book My Parcel OTP is: ${otp}. This OTP will expire in 5 minutes.`,
      from: process.env.TWILIO_FROM_NUMBER,
      to: formattedPhoneNumber
    });
    
    console.log(`OTP ${otp} sent successfully to ${formattedPhoneNumber}`);
    return { success: true, message: 'OTP sent successfully', messageId: message.sid };
  } catch (error) {
    console.error('Error sending OTP:', error);
    
    // Handle specific Twilio errors
    if (error.message.includes('username') || error.message.includes('Invalid')) {
      console.log('Twilio error. Falling back to simulated OTP.');
      return { success: true, message: 'OTP sent successfully (simulated)', messageId: 'simulated' };
    }
    
    return { success: false, message: 'Failed to send OTP', error: error.message };
  }
};