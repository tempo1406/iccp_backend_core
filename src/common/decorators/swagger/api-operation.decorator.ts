// src/common/decorators/swagger/api-operation.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiOperationAuto(summary: string, description?: string) {
  return applyDecorators(
    ApiOperation({
      summary,
      description: description || summary,
    }),
  );
}
