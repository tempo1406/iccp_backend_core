import {
  HttpStatus,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipeOptions,
} from '@nestjs/common';

const validationOptions: ValidationPipeOptions = {
  transform: true,
  whitelist: false,
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  exceptionFactory: (validationErrors: ValidationError[] = []) => {
    return new UnprocessableEntityException(validationErrors);
  },
};

export default validationOptions;
