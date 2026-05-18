import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiInternalCoreHttpService {
  private readonly logger = new Logger(AiInternalCoreHttpService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get aiBaseUrl(): string {
    return (
      this.config.get<string>('app.aiServiceBaseUrl') ??
      'http://iccp-be-ai:8001'
    );
  }

  private get internalApiKey(): string {
    return this.config.get<string>('app.internalApiKey') ?? '';
  }

  private get headers() {
    return { 'x-internal-key': this.internalApiKey };
  }

  private buildUrl(path: string): string {
    const base = this.aiBaseUrl.replace(/\/+$/, '');
    const normalizedPath = path.replace(/^\/+/, '');
    return `${base}/${normalizedPath}`;
  }

  async patch(path: string, body: unknown, timeout = 5000): Promise<boolean> {
    try {
      await this.httpService.axiosRef.patch(this.buildUrl(path), body, {
        headers: this.headers,
        timeout,
      });
      return true;
    } catch (error: any) {
      this.logger.warn(
        `PATCH ${path} failed: ${error?.message ?? String(error)}`,
      );
      return false;
    }
  }

  async delete(path: string, body?: unknown, timeout = 5000): Promise<boolean> {
    try {
      await this.httpService.axiosRef.delete(this.buildUrl(path), {
        headers: this.headers,
        data: body,
        timeout,
      });
      return true;
    } catch (error: any) {
      this.logger.warn(
        `DELETE ${path} failed: ${error?.message ?? String(error)}`,
      );
      return false;
    }
  }
}
