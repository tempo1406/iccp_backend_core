import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '@common/decorators/auth/public.decorator';
import { LocalAuthGuard } from '@guards/local-guard/local-auth.guard';
import { LoginRequest } from './dto/request/login.request';
import { RegisterRequest } from './dto/request/register.request';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiSecurity,
} from '@nestjs/swagger';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import { RefreshJwtDto } from './types/refresh-jwt.type';
import { RefreshTokenGuard } from '@guards/jwt-guard/refresh-jwt.guard';
import { VerifyEmailRequest } from './dto/request/verify-email.request';
import { ResendOtpRequest } from './dto/request/resend-otp.request';
import { ResetPasswordRequest } from './dto/request/reset-password.request';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { LoginResponse } from './dto/response/login.response';
import { RefreshTokenResponse } from './dto/response/refreshtoken.response';
import { IntrospectResponse } from './dto/response/introspect.response';
import { LegacyInternalKeyGuard } from '@guards/internal-key-guard/legacy-internal-key.guard';
import { GetUser } from '@common/decorators/auth/get-user.decorator';

@ApiBearerAuth('Authorization')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperationAuto('Register for user', 'Create a account for this product')
  async register(
    @Body() payload: RegisterRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.authService.register(payload);
    return new ApiResponseDto(201, 'Register Successfully!');
  }

  @Public()
  @Post('login')
  @ApiBody({ type: LoginRequest })
  @ApiOperationAuto('Login for user', 'Authenticate user and return JWT token')
  @UseGuards(LocalAuthGuard)
  async login(@Req() req: any): Promise<ApiResponseDto<LoginResponse>> {
    const response = await this.authService.login(req.user.id as string);
    return new ApiResponseDto(200, 'Login Successfully!', response);
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh-token')
  @ApiOperationAuto('Refresh token', 'Refresh token')
  @ApiBody({ type: RefreshJwtDto })
  async refreshToken(
    @Req() req: any,
  ): Promise<ApiResponseDto<RefreshTokenResponse>> {
    const userId = req.user.sub as string;
    const roles = Array.isArray(req.user.role)
      ? (req.user.role as string[])
      : [req.user.role as string];
    const refreshToken = req.body.refreshToken as string;
    const response = await this.authService.refreshToken(
      userId,
      roles,
      refreshToken,
    );
    return new ApiResponseDto(200, 'Refresh token successfully!', response);
  }

  @Public()
  @Post('verify-email')
  @ApiOperationAuto(
    'Xác thực email',
    'Nhập OTP được gửi qua email để kích hoạt tài khoản',
  )
  async verifyEmail(
    @Body() dto: VerifyEmailRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.authService.verifyEmail(dto.email, dto.otp);
    return new ApiResponseDto(200, 'Email verified successfully!');
  }

  @Public()
  @Post('resend-otp')
  @ApiOperationAuto(
    'Gửi lại OTP',
    'Gửi lại mã OTP xác thực email cho tài khoản chưa verify',
  )
  async resendOtp(
    @Body() dto: ResendOtpRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.authService.resendVerificationOtp(dto.email);
    return new ApiResponseDto(200, 'OTP resent successfully!');
  }

  @Public()
  @Post('forgot-password')
  @ApiOperationAuto('Quên mật khẩu', 'Gửi mã OTP vào email để đặt lại mật khẩu')
  async forgotPassword(
    @Body() dto: ResendOtpRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.authService.forgotPassword(dto.email);
    return new ApiResponseDto(200, 'Password reset OTP sent to your email!');
  }

  @Public()
  @Post('reset-password')
  @ApiOperationAuto(
    'Đặt lại mật khẩu',
    'Nhập OTP và mật khẩu mới để đầt lại mật khẩu',
  )
  async resetPassword(
    @Body() dto: ResetPasswordRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
    return new ApiResponseDto(200, 'Password reset successfully!');
  }

  /**
   * Token introspection endpoint — called by iccp_be_ai to identify the current user.
   *
   * Authentication: Bearer JWT (user token) + X-Internal-Key (service secret).
   * Both must be valid for the request to succeed.
   */
  @UseGuards(LegacyInternalKeyGuard)
  @Post('introspect')
  @ApiOperation({
    summary: 'Introspect token (service-to-service)',
    description:
      'Validate a Bearer JWT and return the user identity. ' +
      'Called internally by **iccp_be_ai** to identify users. ' +
      'Requires both a valid Bearer JWT (`Authorization` header) ' +
      'AND a valid internal service key (`X-Internal-Key` header).',
  })
  @ApiSecurity('X-Internal-Key')
  async introspect(
    @GetUser('sub') userId: string,
    @GetUser('role') roles: string | string[],
  ): Promise<ApiResponseDto<IntrospectResponse>> {
    const normalizedRoles = Array.isArray(roles) ? roles : [roles];
    const response = await this.authService.introspect(userId, normalizedRoles);
    return new ApiResponseDto(200, 'Token introspected successfully', response);
  }
}
