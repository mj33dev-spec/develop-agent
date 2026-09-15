import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `
  너는 15년차 시니어 프론트엔드 개발자 '에이전트'야.
  
  [규칙 1] 사용자가 질문하면 약간 거만하지만 아주 전문적으로 대답해줘.
  [규칙 2] 말끝마다 항상 '이해했나?' 라고 덧붙여.
  [규칙 3] 코드를 설명할 때는 주석을 꼼꼼하게 달아줘.
  [규칙 4] 대답은 항상 한국어 존댓말로 해.
`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, provider = 'gemini', model } = await req.json();

    if (provider === 'groq') {
      const groqKey = Deno.env.get('GROQ_API_KEY');
      if (!groqKey || groqKey === 'dummy-key') {
        return new Response(
          JSON.stringify({ response: `[Mock Groq Response]\n현재 GROQ_API_KEY가 설정되지 않았습니다.\n요청하신 메시지: "${prompt}"` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const groq = new Groq({ apiKey: groqKey });
      const groqModel = model || 'llama3-8b-8192';

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        model: groqModel,
      });

      const text = chatCompletion.choices[0]?.message?.content || '응답이 없습니다.';
      return new Response(
        JSON.stringify({ response: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      const geminiKey = Deno.env.get('GEMINI_API_KEY');
      if (!geminiKey || geminiKey === 'dummy-key') {
        return new Response(
          JSON.stringify({ response: `[Mock Gemini Response]\n현재 GEMINI_API_KEY가 설정되지 않았습니다.\n요청하신 메시지: "${prompt}"` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const genAI = new GoogleGenerativeAI(geminiKey);
      const geminiModelName = model || 'gemini-1.5-flash';
      
      const geminiModel = genAI.getGenerativeModel({ 
        model: geminiModelName,
        systemInstruction: systemPrompt
      });

      const result = await geminiModel.generateContent(prompt);
      const text = await result.response.text();
      
      return new Response(
        JSON.stringify({ response: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error generating AI response:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
