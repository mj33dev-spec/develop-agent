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
      
      let groqModel = model || 'qwen/qwen3.8-27b';
      if (groqModel === 'llama-3.1-8b-instant' || groqModel === 'llama-3.3-70b-versatile' || groqModel === 'deepseek-r1-distill-llama-70b') {
        groqModel = 'qwen/qwen3.8-27b';
      }

      try {
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
      } catch (err: any) {
        return new Response(
          JSON.stringify({ response: `[Groq 오류] ${err.message || 'Groq API 호출 실패'}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } else if (provider === 'openrouter') {
      const openrouterKey = (Deno.env.get('OPENROUTER_API_KEY') || '').trim();
      if (!openrouterKey || openrouterKey === 'dummy-key') {
        return new Response(
          JSON.stringify({ response: `[Mock OpenRouter Response]\n현재 OPENROUTER_API_KEY가 설정되지 않았습니다.\n요청하신 메시지: "${prompt}"` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let openrouterModel = 'liquid/lfm-2.5-2.6b:free';
      if (model && (model.includes('cohere') || model.includes('Cohere') || model.includes('qwen') || model.includes('code'))) {
        openrouterModel = 'inclusionai/ling-3.0-flash-vl:free';
      }

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'http://localhost:4200',
          'X-Title': 'DevelopAgent',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: openrouterModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.error?.message || data?.message || 'OpenRouter API 호출 오류가 발생했습니다.';
        return new Response(
          JSON.stringify({ response: `[OpenRouter 오류] ${errMsg}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const text = data.choices?.[0]?.message?.content || 'OpenRouter 응답이 없습니다.';
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

      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        let geminiModelName = model || 'gemini-1.5-flash';
        if (geminiModelName === 'gemini-3.6-flash') geminiModelName = 'gemini-1.5-flash';
        if (geminiModelName === 'gemini-3.1-pro-preview') geminiModelName = 'gemini-1.5-pro';

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
      } catch (err: any) {
        return new Response(
          JSON.stringify({ response: `[Gemini 오류] ${err.message || 'Gemini API 호출 실패'}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch (error: any) {
    console.error('Error generating AI response:', error);
    return new Response(
      JSON.stringify({ response: `[서버 오류] ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
