import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { IsNull, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { compareString, convertToSeconds, hashString } from '@utils/auth';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { plainToInstance } from 'class-transformer';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { USER_EVENTS } from '@modules/events/constants/user-events.constant';
import { ValidationException } from '@common/exceptions/validation.exception';
import { getDefaultAvatarUrl } from '@utils/default-avatar';
import { ErrorCode } from '@common/constants/error-code.constant';
import { UpdateProfileRequest } from './dto/request/update-profile.request';
import { CreateUserRequest } from './dto/request/create-user.request';
import { UserResponse } from './dto/response/user.response';
import {
  GetUsersQueryRequest,
  USER_SORT_FIELDS,
} from './dto/request/get-users-query.request';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { PaginationHelper } from '@common/helpers/pagination.helper';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRedis()
    private redis: Redis,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(createUserDto: CreateUserRequest) {
    try {
      const user = this.userRepository.create(createUserDto);
      await this.userRepository.save(user);
      this.eventEmitter.emit(USER_EVENTS.CREATED);
      return plainToInstance(UserResponse, user);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new ValidationException(ErrorCode.U006);
    }
  }

  async findAll(
    query: GetUsersQueryRequest = {},
  ): Promise<PaginatedResponse<UserResponse>> {
    try {
      const alias = 'u';
      const qb = this.userRepository
        .createQueryBuilder(alias)
        .where(`${alias}.deletedAt IS NULL`);

      if (query.search) {
        qb.andWhere(
          `(${alias}.email ILIKE :search OR ${alias}.firstName ILIKE :search OR ${alias}.lastName ILIKE :search)`,
          { search: `%${query.search}%` },
        );
      }

      if (query.isActive !== undefined) {
        qb.andWhere(`${alias}.isActive = :isActive`, {
          isActive: query.isActive,
        });
      }

      if (query.isVerified !== undefined) {
        qb.andWhere(`${alias}.isVerified = :isVerified`, {
          isVerified: query.isVerified,
        });
      }

      if (query.provider) {
        qb.andWhere(`${alias}.provider = :provider`, {
          provider: query.provider,
        });
      }

      PaginationHelper.applyToQueryBuilder(qb, query, USER_SORT_FIELDS, alias);

      const [users, total] = await qb.getManyAndCount();
      const items = plainToInstance(UserResponse, users);
      const meta = PaginationHelper.buildMeta(total, query);

      return new PaginatedResponse(items, meta);
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserResponse> {
    const user = await this.userRepository.findOne({
      where: { email },
    });
    return plainToInstance(UserResponse, user);
  }

  async findByEmailIncludePassword(email: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email, deletedAt: IsNull() },
      select: [
        'id',
        'email',
        'passwordHash',
        'firstName',
        'lastName',
        'avatarUrl',
        'locale',
        'provider',
        'isActive',
        'isVerified',
        'createdAt',
        'updatedAt',
      ],
    });
    if (user && !user.avatarUrl) {
      user.avatarUrl = getDefaultAvatarUrl();
    }
    return user;
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    try {
      const refreshTokenTtl = this.configService.get(
        'refresh-jwt.expiresIn',
      ) as string;

      const hashedRefreshToken = await hashString(refreshToken);
      const refreshTokenTtlInSeconds = convertToSeconds(refreshTokenTtl);
      await this.redis.set(
        `RT_${userId}`,
        hashedRefreshToken,
        'EX',
        refreshTokenTtlInSeconds,
      );
    } catch (error) {
      console.error('Error updating refresh token:', error);
      throw error;
    }
  }

  async getRefreshToken(userId: string) {
    const refreshToken = await this.redis.get(`RT_${userId}`);
    return refreshToken;
  }

  async deleteRefreshToken(userId: string) {
    await this.redis.del(`RT_${userId}`);
  }

  async findById(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    return plainToInstance(UserResponse, user);
  }

  // GET /me
  async getMe(userId: string): Promise<UserResponse> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException(ErrorCode.U003);
      return plainToInstance(UserResponse, user);
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // PATCH /me
  async updateProfile(
    userId: string,
    dto: UpdateProfileRequest,
  ): Promise<UserResponse> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException(ErrorCode.U003);

      Object.assign(user, dto);
      const saved = await this.userRepository.save(user);
      return plainToInstance(UserResponse, saved);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // POST /users (admin tạo thủ công)
  async adminCreateUser(dto: CreateUserRequest): Promise<void> {
    try {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) throw new ValidationException(ErrorCode.U005);

      const hashedPassword = await hashString(dto.passwordHash);
      const user = this.userRepository.create({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash: hashedPassword,
        provider: 'local',
        isVerified: true, // Admin tạo → không cần OTP
        isActive: true,
      });
      await this.userRepository.save(user);
      this.eventEmitter.emit(USER_EVENTS.CREATED);
    } catch (error) {
      console.error('Error admin creating user:', error);
      throw error;
    }
  }

  // DELETE /users/:id
  async deleteUser(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException(ErrorCode.U003);
      await this.userRepository.softRemove(user);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // PATCH /users/:id/ban
  async banUser(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException(ErrorCode.U003);
      if (!user.isActive) throw new ValidationException(ErrorCode.U010); // Đã bị ban rồi
      await this.userRepository.update({ id: userId }, { isActive: false });
    } catch (error) {
      console.error('Error banning user:', error);
      throw error;
    }
  }

  // PATCH /users/:id/unban
  async unbanUser(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException(ErrorCode.U003);
      if (user.isActive) throw new ValidationException(ErrorCode.U010); // Không bị ban
      await this.userRepository.update({ id: userId }, { isActive: true });
    } catch (error) {
      console.error('Error unbanning user:', error);
      throw error;
    }
  }

  // Auth helpers
  async markEmailVerified(email: string): Promise<void> {
    await this.userRepository.update(
      { email },
      { isVerified: true, emailVerifiedAt: new Date() },
    );
  }

  async updatePassword(email: string, hashedPassword: string): Promise<void> {
    await this.userRepository.update(
      { email },
      { passwordHash: hashedPassword },
    );
  }

  // Load user kèm passwordHash theo userId (dùng cho change-password)
  async findByIdIncludePassword(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, deletedAt: IsNull() },
      select: ['id', 'email', 'passwordHash', 'isActive'],
    });
  }

  // Change password (không cần OTP, cần nhập mk cũ)
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    try {
      const user = await this.findByIdIncludePassword(userId);
      if (!user) throw new NotFoundException(ErrorCode.U003);

      const isOldPasswordValid = await compareString(
        oldPassword,
        user.passwordHash,
      );
      if (!isOldPasswordValid) {
        throw new ValidationException(ErrorCode.U011);
      }

      const hashedNewPassword = await hashString(newPassword);
      await this.updatePassword(user.email, hashedNewPassword);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
}
