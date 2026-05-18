import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { EventsModule } from '@modules/events/event.module';
import { UserSubscriber } from './subscribers/user.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => EventsModule)],
  controllers: [UsersController],
  exports: [UsersService],
  providers: [UsersService, UserSubscriber],
})
export class UsersModule {}
