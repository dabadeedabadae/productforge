import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ChatTreeService } from '@modules/chat-tree/chat-tree.service';
import { CreateSessionDto } from '@modules/chat-tree/dto/create-session.dto';
import { CreateNodeDto } from '@modules/chat-tree/dto/create-node.dto';
import { MergeNodesDto } from '@modules/chat-tree/dto/merge-nodes.dto';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('chat')
export class ChatTreeController {
  constructor(private readonly service: ChatTreeService) {}

  @Get('sessions')
  listSessions() {
    return this.service.listSessions();
  }

  @Post('sessions')
  createSession(@Body() dto: CreateSessionDto) {
    return this.service.createSession(dto);
  }

  @Post('sessions/:id/nodes')
  createNode(@Param('id') sessionId: string, @Body() dto: CreateNodeDto) {
    return this.service.createNode(sessionId, dto);
  }

  @Post('sessions/:id/nodes/:nodeId/checkout')
  checkoutNode(@Param('id') sessionId: string, @Param('nodeId') nodeId: string) {
    return this.service.checkoutNode(sessionId, nodeId);
  }

  @Get('sessions/:id/nodes/:nodeId')
  getNodeDetail(@Param('id') sessionId: string, @Param('nodeId') nodeId: string) {
    return this.service.getNodeDetail(sessionId, nodeId);
  }

  @Get('sessions/:id/tree')
  getTree(@Param('id') sessionId: string) {
    return this.service.getTree(sessionId);
  }

  @Get('sessions/:id/diff')
  getDiff(
    @Param('id') sessionId: string,
    @Query('left') leftNodeId?: string,
    @Query('right') rightNodeId?: string,
  ) {
    if (!leftNodeId || !rightNodeId) {
      throw new BadRequestException('Query parameters "left" and "right" are required');
    }
    return this.service.diffNodes(sessionId, leftNodeId, rightNodeId);
  }

  @Post('sessions/:id/merge')
  mergeNodes(@Param('id') sessionId: string, @Body() dto: MergeNodesDto) {
    return this.service.mergeNodes(sessionId, dto);
  }

  @Get('sessions/:id/merges')
  listMerges(@Param('id') sessionId: string) {
    return this.service.listMergeOperations(sessionId);
  }
}
