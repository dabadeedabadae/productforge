import { Module } from '@nestjs/common';
import { ChatTreeController } from './chat-tree.controller';
import { ChatTreeService } from './chat-tree.service';
import { ChatTreeRepository } from './chat-tree.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChatTreeController],
  providers: [ChatTreeService, ChatTreeRepository],
})
export class ChatTreeModule {}
