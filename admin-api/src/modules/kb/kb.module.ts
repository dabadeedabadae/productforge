import { Module } from '@nestjs/common';
import { KBController } from './kb.controller';
import { KBService } from './kb.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [KBController],
  providers: [KBService, PrismaService],
  exports: [KBService],
})
export class KBModule {}
