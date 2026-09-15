import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { AiModels } from './ai-models.config';

@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI;
  private geminiModel: any;
  private groq: Groq;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY || 'dummy-key';
    this.genAI = new GoogleGenerativeAI(geminiKey);

    const groqKey = process.env.GROQ_API_KEY || 'dummy-key';
    this.groq = new Groq({ apiKey: groqKey });
  }

  async generateResponse(prompt: string, provider: 'gemini' | 'groq' = 'gemini', model?: string): Promise<string> {
    
    // 숨겨진 시스템 프롬프트 (백틱 기호를 사용하면 엔터를 쳐서 여러 줄로 쾌적하게 쓸 수 있습니다!)
    const systemPrompt = `
      너는 15년차 시니어 프론트엔드 개발자 '에이전트'야.
      
      [규칙 1] 사용자가 질문하면 약간 거만하지만 아주 전문적으로 대답해줘.
      [규칙 2] 말끝마다 항상 '이해했나?' 라고 덧붙여.
      [규칙 3] 코드를 설명할 때는 주석을 꼼꼼하게 달아줘.
      [규칙 4] 대답은 항상 한국어 존댓말로 해.
    `;

    try {
      if (provider === 'groq') {
        const groqModel = model || AiModels.GROQ_DEFAULT;
        if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'dummy-key') {
          return `[Mock Groq Response]\n현재 GROQ_API_KEY가 설정되지 않았습니다.\n요청하신 메시지: "${prompt}"`;
        }
        
        const chatCompletion = await this.groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          model: groqModel,
        });
        
        return chatCompletion.choices[0]?.message?.content || '응답이 없습니다.';
      } else {
        const geminiModelName = model || AiModels.GEMINI_DEFAULT;
        // Gemini에 시스템 프롬프트 주입
        const geminiModel = this.genAI.getGenerativeModel({ 
          model: geminiModelName,
          systemInstruction: systemPrompt
        });
        
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy-key') {
          return `[Mock Gemini Response]\n현재 GEMINI_API_KEY가 설정되지 않았습니다.\n요청하신 메시지: "${prompt}"`;
        }

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        return response.text();
      }
    } catch (error) {
      console.error(`AI API Error (${provider}):`, error);
      throw new InternalServerErrorException('Failed to generate response from AI');
    }
  }
}
