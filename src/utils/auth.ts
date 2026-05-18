import * as argon2 from 'argon2';

export const hashString = async (string: string): Promise<string> => {
  try {
    return await argon2.hash(string);
  } catch (error) {
    console.error('Error hashing string:', error);
    throw error;
  }
};

export const compareString = async (
  string: string,
  hash: string,
): Promise<boolean> => {
  try {
    return await argon2.verify(hash, string);
  } catch (error) {
    console.error('Error comparing string:', error);
    throw error;
  }
};

export const generateOtp = (): string => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
};

export const convertToSeconds = (timeString: string): number => {
  // Regular expression to match the value and unit (e.g., "15s", "1h", "2d")
  const regex = /^(\d+)([smhdwy])$/;

  // Match the input string
  const match = timeString.match(regex);

  if (!match) {
    throw new Error("Invalid time format. Use formats like '15s', '1h', '2d'.");
  }

  const value = parseInt(match[1], 10); // Extract the numeric value
  const unit = match[2]; // Extract the unit (s, m, h, d, w, y)

  switch (unit) {
    case 's': // Seconds
      return value;
    case 'm': // Minutes
      return value * 60;
    case 'h': // Hours
      return value * 60 * 60;
    case 'd': // Days
      return value * 60 * 60 * 24;
    case 'w': // Weeks
      return value * 60 * 60 * 24 * 7;
    case 'y': // Years
      return value * 60 * 60 * 24 * 365;
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
};
