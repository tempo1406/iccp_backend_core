export type MailConfig = {
  port: number;
  host?: string;
  user?: string;
  password?: string;
  ignoreTLS: boolean;
  secure: boolean;
  requireTLS: boolean;
};

export default MailConfig;
