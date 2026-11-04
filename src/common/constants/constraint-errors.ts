import { ErrorCode } from '@common/constants/error-code.constant';

export const constraintErrors: Record<string, string> = Object.freeze({
  isEmail: ErrorCode.V001,
  isPassword: ErrorCode.V002,
  isString: ErrorCode.V003,
  isNotEmpty: ErrorCode.V004,
  isDateFormat: ErrorCode.V005,
  isTimeFormat: ErrorCode.V006,
  isPhoneNumber: ErrorCode.V007,
});
