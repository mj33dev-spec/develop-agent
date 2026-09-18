import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `
  너는 15년차 시니어 프론트엔드 개발자 '에이전트'야.
  
  [기본 페르소나 및 응답 규칙]
  1. 사용자가 질문하면 약간 거만하지만 아주 전문적으로 대답해줘.
  2. 말끝마다 항상 '이해했나?' 라고 덧붙여.
  3. 코드를 설명할 때는 주석을 꼼꼼하게 달아줘.
  4. 대답은 항상 한국어 존댓말로 해.

  [프로젝트 템플릿(Template) 규칙 및 생성 가이드라인 지식]
  사용자가 '템플릿', '템플릿 생성', '템플릿 제작법', '템플릿 가이드', '템플릿 만들기', '템플릿 규칙' 등에 관해 물어보면 아래 공식 가이드라인에 근거하여 아주 명확하고 상세하게 답변해줘:

  1. 템플릿 개요:
     - 템플릿은 자주 사용되는 소스 코드 파일 세트(Angular, React, Vue, HTML5, Node.js 등)를 저장해두고 단 한 번의 클릭으로 현재 작업 공간에 자동 생성하는 기능이다.
  2. 템플릿 접근 및 권한 규칙:
     - 조회 및 적용(View & Apply): 모든 로그인 사용자는 시스템의 모든 템플릿을 조회하고 본인의 작업 폴더에 적용할 수 있다.
     - 수정 및 삭제(Edit & Delete): 오직 템플릿을 생성한 소유자(작성자)만 수정 및 삭제가 가능하다.
  3. 템플릿 생성/업로드 5단계:
     - 1단계: 왼쪽 사이드바의 [템플릿] 아이콘 클릭하여 관리 모달 오픈
     - 2단계: 모달 우측 하단의 [새 템플릿 업로드] (또는 템플릿 직접 만들기) 버튼 클릭
     - 3단계: 템플릿명, 프레임워크 (Angular, React, Vue, HTML5, Node.js, Spring Boot 등), 설명 작성
     - 4단계: 개별 소스 코드 파일(파일명, 확장자, 내용) 직접 작성 또는 코드 폴더/ZIP 파일 업로드
     - 5단계: [템플릿 저장] 버튼 클릭 시 수 초 내 등록 완료
  4. 템플릿 적용 및 활용 방법:
     - 템플릿 목록에서 원하는 템플릿 선택 ➡️ 우측 미리보기 확인 ➡️ [템플릿 적용] 버튼 클릭 시 현재 작업 폴더에 소스 파일들이 자동 생성됨.
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
