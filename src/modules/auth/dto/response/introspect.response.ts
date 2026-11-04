import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class IntrospectResponse {
  @Expose()
  userId: string;

  @Expose()
  email: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  avatarUrl: string;

  @Expose()
  roles: string[];

  @Expose()
  isActive: boolean;

  @Expose()
  isVerified: boolean;
}
