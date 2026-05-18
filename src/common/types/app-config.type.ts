export type AppConfig = {
  nodeEnv: string;
  name: string;
  workingDirectory: string;
  frontendDomain?: string;
  backendDomain: string;
  aiServiceBaseUrl: string;
  internalApiKey: string;
  apiPrefix: string;
  port: number;
  fallbackLanguage: string;
  headerLanguage: string;
  debug: boolean | string;
};