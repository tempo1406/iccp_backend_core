import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginRequest } from '../dto/request/login.request';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    try {
      // Transform và validate DTO
      const loginDto = plainToInstance(LoginRequest, { email, password });

      const errors = await validate(loginDto);

      if (errors.length > 0) {
        const constraints = errors
          .map((error) => Object.values(error.constraints || {}))
          .flat();
        throw new UnauthorizedException(constraints[0] || 'Invalid login data');
      }

      // Proceed with user validation
      const user = await this.authService.validateUser(
        loginDto.email,
        loginDto.password,
      );
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return user;
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException('Invalid login data');
    }
  }
}
