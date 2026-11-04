import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { OrgSettings } from './entities/org-settings.entity';
import { UpsertOrgSettingsRequest } from './dto/request/upsert-org-settings.request';
import { OrgSettingsResponse } from './dto/response/org-settings.response';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';

const DEFAULT_AI_TOKEN_LIMIT = 10_000_000;

type AiOrgQuotaPayload = {
  data?: {
    token_limit?: number;
  };
};

@Injectable()
export class OrgSettingsService {
  private readonly logger = new Logger(OrgSettingsService.name);

  constructor(
    @InjectRepository(OrgSettings)
    private readonly orgSettingsRepo: Repository<OrgSettings>,
    private readonly configService: ConfigService,
  ) {}

  async getSettings(orgId: string): Promise<OrgSettingsResponse> {
    const settings = await this.getOrCreate(orgId);
    const aiTokenLimit = await this.getAiTokenLimit(orgId);
    return this.toResponse(settings, aiTokenLimit);
  }

  async upsertSettings(
    orgId: string,
    dto: UpsertOrgSettingsRequest,
  ): Promise<OrgSettingsResponse> {
    this.validateWeights(dto);
    const { aiTokenLimit, ...settingsPayload } = dto;
    const resolvedAiTokenLimit =
      aiTokenLimit != null
        ? await this.updateAiTokenLimit(orgId, aiTokenLimit)
        : await this.getAiTokenLimit(orgId);

    let settings = await this.orgSettingsRepo.findOne({
      where: { organizationId: orgId },
    });
    if (!settings) {
      settings = this.orgSettingsRepo.create({ organizationId: orgId });
    }

    Object.assign(settings, settingsPayload);
    const saved = await this.orgSettingsRepo.save(settings);

    return this.toResponse(saved, resolvedAiTokenLimit);
  }

  async getOrCreate(orgId: string): Promise<OrgSettings> {
    let settings = await this.orgSettingsRepo.findOne({
      where: { organizationId: orgId },
    });

    if (!settings) {
      settings = this.orgSettingsRepo.create({ organizationId: orgId });
      settings = await this.orgSettingsRepo.save(settings);
    }

    return settings;
  }

  private toResponse(
    settings: OrgSettings,
    aiTokenLimit: number,
  ): OrgSettingsResponse {
    return plainToInstance(
      OrgSettingsResponse,
      {
        ...settings,
        aiTokenLimit,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  private async getAiTokenLimit(orgId: string): Promise<number> {
    const quota = await this.fetchAiOrgQuota(orgId, {
      endpointPath: '/api/v1/quotas/org/internal',
      method: 'GET',
      required: false,
    });

    return quota?.tokenLimit ?? DEFAULT_AI_TOKEN_LIMIT;
  }

  private async updateAiTokenLimit(
    orgId: string,
    tokenLimit: number,
  ): Promise<number> {
    const quota = await this.fetchAiOrgQuota(orgId, {
      endpointPath: '/api/v1/quotas/org',
      method: 'PUT',
      required: true,
      body: JSON.stringify({ token_limit: tokenLimit }),
    });

    if (!quota) {
      throw new InternalServerErrorException(
        `Unable to update AI token limit for organization ${orgId}`,
      );
    }

    return quota.tokenLimit;
  }

  private async fetchAiOrgQuota(
    orgId: string,
    options: {
      endpointPath: string;
      method: 'GET' | 'PUT';
      required: boolean;
      body?: string;
    },
  ): Promise<{ tokenLimit: number } | null> {
    const appConfig = this.configService.get('app', { infer: true });
    const internalApiKey = this.configService.get<string>('INTERNAL_API_KEY');

    if (!appConfig?.aiServiceBaseUrl) {
      const message = `AI quota service is not configured for org ${orgId}: BE_AI_BASE_URL is missing.`;
      if (options.required) {
        throw new InternalServerErrorException(message);
      }
      this.logger.warn(`${message} Falling back to default token limit.`);
      return null;
    }

    if (!internalApiKey) {
      const message = `AI quota service is not configured for org ${orgId}: INTERNAL_API_KEY is missing.`;
      if (options.required) {
        throw new InternalServerErrorException(message);
      }
      this.logger.warn(`${message} Falling back to default token limit.`);
      return null;
    }

    const endpoint = new URL(options.endpointPath, appConfig.aiServiceBaseUrl);
    endpoint.searchParams.set('org_id', orgId);

    let response: Response;
    try {
      response = await fetch(endpoint.toString(), {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': internalApiKey,
        },
        body: options.body,
      });
    } catch (error) {
      const message =
        `Failed to ${options.method === 'PUT' ? 'update' : 'read'} AI token limit for org ${orgId}: ` +
        `${error instanceof Error ? error.message : 'Unknown network error'}`;

      if (options.required) {
        this.logger.error(message);
        throw new InternalServerErrorException(
          `Unable to ${options.method === 'PUT' ? 'update' : 'read'} AI token limit for organization ${orgId}`,
        );
      }

      this.logger.warn(`${message}. Falling back to default token limit.`);
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      const message =
        `Failed to ${options.method === 'PUT' ? 'update' : 'read'} AI token limit for org ${orgId}. ` +
        `Status=${response.status}. Body=${errorText}`;

      if (options.required) {
        this.logger.error(message);
        throw new InternalServerErrorException(
          `Unable to ${options.method === 'PUT' ? 'update' : 'read'} AI token limit for organization ${orgId}`,
        );
      }

      this.logger.warn(`${message}. Falling back to default token limit.`);
      return null;
    }

    let payload: AiOrgQuotaPayload;
    try {
      payload = (await response.json()) as AiOrgQuotaPayload;
    } catch (error) {
      const message =
        `Invalid AI quota response for org ${orgId}: ` +
        `${error instanceof Error ? error.message : 'Unable to parse response body'}`;

      if (options.required) {
        this.logger.error(message);
        throw new InternalServerErrorException(
          `Unable to ${options.method === 'PUT' ? 'update' : 'read'} AI token limit for organization ${orgId}`,
        );
      }

      this.logger.warn(`${message}. Falling back to default token limit.`);
      return null;
    }

    const resolvedTokenLimit = payload?.data?.token_limit;

    if (typeof resolvedTokenLimit !== 'number') {
      const message = `Invalid AI quota response for org ${orgId}: token_limit is missing.`;

      if (options.required) {
        this.logger.error(message);
        throw new InternalServerErrorException(
          `Unable to ${options.method === 'PUT' ? 'update' : 'read'} AI token limit for organization ${orgId}`,
        );
      }

      this.logger.warn(`${message} Falling back to default token limit.`);
      return null;
    }

    return { tokenLimit: resolvedTokenLimit };
  }

  private validateWeights(dto: UpsertOrgSettingsRequest) {
    const {
      defaultWeightPointCompletion: w1,
      defaultWeightOnTime: w2,
      defaultWeightOtContribution: w3,
    } = dto;
    const anyProvided = w1 != null || w2 != null || w3 != null;
    if (!anyProvided) return;

    const allProvided = w1 != null && w2 != null && w3 != null;
    if (!allProvided) {
      throw new ValidationException(ErrorCode.OS001);
    }

    const sum = +w1 + +w2 + +w3;
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new ValidationException(
        ErrorCode.OS002,
        `KPI weights must sum to 1.0, got ${sum.toFixed(3)}`,
      );
    }
  }
}
