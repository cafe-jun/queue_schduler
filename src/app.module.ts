import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WatcherThreadService } from './worker-queue/watcher-thread.service';
import { SocketGateway } from './worker-queue/socket.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, WatcherThreadService, SocketGateway],
})
export class AppModule {}
