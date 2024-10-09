import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Task, WatcherThreadService } from './watcher-thread.service';
import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

@WebSocketGateway()
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger = new Logger(SocketGateway.name);
  constructor(private readonly watcherThreadService: WatcherThreadService) {}

  afterInit(server: any) {
    this.logger.log('Socket gateway initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('start-task')
  async startTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() task: string,
  ) {
    await this.watcherThreadService.addTask(task);
  }
}
