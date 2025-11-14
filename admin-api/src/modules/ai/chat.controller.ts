import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('ai/chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('sessions')
  listSessions() {
    return this.chat.listSessions();
  }

  @Post('sessions')
  createSession(@Body('title') title?: string) {
    return this.chat.createSession(title);
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string) {
    return this.chat.getMessages(id);
  }

  @Post('sessions/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    return this.chat.sendMessage(id, content);
  }
}
