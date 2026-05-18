import { Global, Module } from '@nestjs/common';
import { ImageKitService } from './imagekit.service';
import { ImageKitProvider } from './imagekit.provider';
import { ImageKitController } from './imagekit.controller';

@Global()
@Module({
  controllers: [ImageKitController],
  providers: [ImageKitService, ImageKitProvider],
  exports: [ImageKitService],
})
export class ImagekitModule {}
