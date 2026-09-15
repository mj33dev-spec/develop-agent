import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async sendMessage(
    @Body('prompt') prompt: string, 
    @Body('provider') provider?: 'gemini' | 'groq',
    @Body('model') model?: string
  ) {
    const response = await this.chatService.generateResponse(prompt, provider, model);
    return { response };
  }
}
