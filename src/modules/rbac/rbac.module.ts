import { Global, Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRole } from './entities/user-role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permissions.entity';
import { RoleSubscriber } from './subscribers/role.subscriber';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([UserRole, RolePermission, Role, Permission]),
  ],
  controllers: [RbacController],
  providers: [RbacService, RoleSubscriber],
  exports: [RbacService],
})
export class RbacModule {}
