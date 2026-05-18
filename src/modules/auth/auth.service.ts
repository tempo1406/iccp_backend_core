import { UsersService } from '@modules/users/users.service';
import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthJwtPayload } from './types/auth-jwt.payload';
import { JwtService } from '@nestjs/jwt';
import refreshJwtConfig from './configs/refresh-jwt.config';
import { ConfigType } from '@nestjs/config';
import { RegisterRequest } from './dto/request/register.request';
import { compareString, generateOtp, hashString } from '@utils/auth';
import { MaillerService } from '@modules/mail/mail.service';
import { ErrorCode } from '@common/constants/error-code.constant';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { ValidationException } from '@common/exceptions/validation.exception';
import { RbacService } from '@modules/rbac/rbac.service';
import { ConfigService } from '@nestjs/config';
import { LoginResponse } from './dto/response/login.response';
import { plainToInstance } from 'class-transformer';
import { RefreshTokenResponse } from './dto/response/refreshtoken.response';
import { IntrospectResponse } from './dto/response/introspect.response';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly rbacService: RbacService,
    private readonly jwtService: JwtService,
    @Inject(refreshJwtConfig.KEY)
    private readonly refreshTokenConfig: ConfigType<typeof refreshJwtConfig>,
    private readonly maillerService: MaillerService,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  //Validate cho LocalStrategy
  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmailIncludePassword(email);
    if (!user) throw new ValidationException(ErrorCode.U003);
    const isPasswordValid = await compareString(password, user.passwordHash);
    if (!isPasswordValid) throw new ValidationException(ErrorCode.U002);
    return user;
  }

  //Register
  async register(payload: RegisterRequest): Promise<void> {
    try {
      const checkExist = await this.userService.findByEmail(payload.email);
      if (checkExist) throw new ValidationException(ErrorCode.U005);

      const hashedPassword = await hashString(payload.password);
      await this.userService.create({
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        passwordHash: hashedPassword,
        provider: 'local',
      });

      const otp = await this.generateAndStoreOtp(`OTP:VERIFY:${payload.email}`);

      this.maillerService.sendMailOtp(
        payload.email,
        payload.firstName,
        otp,
        'verify',
      );
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  async login(userId: string): Promise<LoginResponse> {
    try {
      const user = await this.userService.findById(userId);
      if (!user.isVerified)
        throw new ForbiddenException({
          errorCode: ErrorCode.U007,
          message: 'Email not verified',
        });
      if (!user.isActive)
        throw new ForbiddenException({
          errorCode: ErrorCode.U010,
          message: 'Account is inactive',
        });

      const systemRoles = await this.rbacService.getUserSystemRole(userId);
      if (!systemRoles.length) {
        throw new UnauthorizedException('User has no system role assigned');
      }

      const { accessToken, refreshToken } = await this.generateTokens(
        userId,
        systemRoles,
      );
      await this.userService.updateRefreshToken(userId, refreshToken);
      return plainToInstance(LoginResponse, { accessToken, refreshToken });
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  //Verify Email
  async verifyEmail(email: string, otp: string): Promise<void> {
    try {
      const user = await this.userService.findByEmail(email);
      if (!user) throw new ValidationException(ErrorCode.U003);
      if (user.isVerified) throw new ValidationException(ErrorCode.U009);

      const stored = await this.redis.get(`OTP:VERIFY:${email}`);
      if (!stored || stored !== otp)
        throw new ValidationException(ErrorCode.U008);

      await this.userService.markEmailVerified(email);
      await this.redis.del(`OTP:VERIFY:${email}`);
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  }

  //Resend OTP (verify)
  async resendVerificationOtp(email: string): Promise<void> {
    try {
      const user = await this.userService.findByEmail(email);
      if (!user) throw new ValidationException(ErrorCode.U003);
      if (user.isVerified) throw new ValidationException(ErrorCode.U009);

      const otp = await this.generateAndStoreOtp(`OTP:VERIFY:${email}`);
      this.maillerService.sendMailOtp(
        email,
        user.firstName ?? email,
        otp,
        'verify',
      );
    } catch (error) {
      console.error('Error resending OTP:', error);
      throw error;
    }
  }

  //Forgot Password
  async forgotPassword(email: string): Promise<void> {
    try {
      const user = await this.userService.findByEmail(email);
      if (!user) throw new ValidationException(ErrorCode.U003);

      const otp = await this.generateAndStoreOtp(`OTP:RESET:${email}`);
      this.maillerService.sendMailOtp(
        email,
        user.firstName ?? email,
        otp,
        'reset',
      );
    } catch (error) {
      console.error('Error sending forgot password OTP:', error);
      throw error;
    }
  }

  //Reset Password
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<void> {
    try {
      const user = await this.userService.findByEmail(email);
      if (!user) throw new ValidationException(ErrorCode.U003);

      const stored = await this.redis.get(`OTP:RESET:${email}`);
      if (!stored || stored !== otp)
        throw new ValidationException(ErrorCode.U008);

      const hashedPassword = await hashString(newPassword);
      await this.userService.updatePassword(email, hashedPassword);
      await this.redis.del(`OTP:RESET:${email}`);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  //Token helpers
  async generateTokens(userId: string, roles: string[]) {
    try {
      const payload: AuthJwtPayload = { sub: userId, role: roles };
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload),
        this.jwtService.signAsync(payload, this.refreshTokenConfig),
      ]);
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Error generating tokens:', error);
      throw error;
    }
  }

  async refreshToken(
    userId: string,
    roles: string[],
    refresh_token: string,
  ): Promise<RefreshTokenResponse> {
    try {
      const refreshTokenRedis = (await this.redis.get(
        `RT_${userId}`,
      )) as string;
      if (!refreshTokenRedis) {
        throw new ForbiddenException('Access Denied');
      }

      const refreshTokenMatches = await compareString(
        refresh_token,
        refreshTokenRedis,
      );
      if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');

      // tao moi at va rt, luu rt vao redis
      const tokens = await this.generateTokens(userId, roles);
      if (!tokens.accessToken || !tokens.refreshToken) {
        throw new ForbiddenException('Access Denied');
      }

      await this.userService.updateRefreshToken(userId, tokens.refreshToken);
      return plainToInstance(RefreshTokenResponse, tokens);
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Introspect a JWT token — called by iccp_be_ai to identify the current user.
   * The token has already been validated by JwtAuthGuard before this method runs.
   * @param userId The `sub` claim from the validated JWT (injected via @GetUser)
   */
  async introspect(
    userId: string,
    roles: string[],
  ): Promise<IntrospectResponse> {
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return plainToInstance(IntrospectResponse, {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        roles,
        isActive: user.isActive,
        isVerified: user.isVerified,
      });
    } catch (error) {
      console.error('Error introspecting token:', error);
      throw error;
    }
  }

  private async generateAndStoreOtp(redisKey: string): Promise<string> {
    try {
      const otp = generateOtp();
      const minutes = parseInt(
        this.configService.get<string>('OTP_EXPIRY_MINUTES') ?? '5',
        10,
      );
      await this.redis.set(redisKey, otp.toString(), 'EX', minutes * 60);
      return otp.toString();
    } catch (error) {
      console.error('Error generating and storing OTP:', error);
      throw error;
    }
  }
}
