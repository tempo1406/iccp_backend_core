import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from '@modules/auth/configs/jwt.config';
import { WebsocketService } from './websocket.service';

@Module({
  imports: [JwtModule.registerAsync(jwtConfig.asProvider()), ConfigModule],
  providers: [WebsocketService],
  exports: [WebsocketService, JwtModule, ConfigModule],
})
export class WebsocketModule {}
