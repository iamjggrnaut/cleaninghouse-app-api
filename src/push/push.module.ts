import { Module, Global } from '@nestjs/common';
import { PushService } from './push.service';

@Global()
@Module({
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}

