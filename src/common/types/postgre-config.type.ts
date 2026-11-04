export type PostgresConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean | { rejectUnauthorized: boolean };
  extra: { sslmode: string } | undefined;
};
