import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export const ORGANIZATION_HEADERS = {
  X_ORGANIZATION_ID: 'x-organization-id',
};

function isUuidV4(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function coerceSingleHeaderValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const firstValue = value.find(
      (item): item is string =>
        typeof item === 'string' && item.trim().length > 0,
    );
    return firstValue?.trim();
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }
  return undefined;
}

export function validateOrganizationId(
  value: unknown,
  source = ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
): string | undefined {
  const organizationId = coerceSingleHeaderValue(value);
  if (!organizationId) {
    return undefined;
  }
  if (!isUuidV4(organizationId)) {
    throw new BadRequestException(`${source} must be a valid UUID v4`);
  }
  return organizationId;
}

export const GetOrgId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return validateOrganizationId(
      request.headers[ORGANIZATION_HEADERS.X_ORGANIZATION_ID],
    );
  },
);
