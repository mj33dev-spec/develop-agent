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
    const { prompt, provider = 'gemini', model, customPrompt } = await req.json();

    // 기본 시스템 프롬프트와 사용자 맞춤 커스텀 프롬프트 결합
    let effectiveSystemPrompt = systemPrompt;
    if (customPrompt && typeof customPrompt === 'string' && customPrompt.trim()) {
      effectiveSystemPrompt = `${systemPrompt}\n\n[사용자 맞춤 커스텀 지침 (최우선 준수)]\n${customPrompt.trim()}`;
    }

    if (provider === 'groq') {
      const groqKey = Deno.env.get('GROQ_API_KEY');
      if (!groqKey || groqKey === 'dummy-key') {
        return new Response(
          JSON.stringify({ response: `[Mock Groq Response]\n현재 GROQ_API_KEY가 설정되지 않았습니다.\n요청하신 메시지: "${prompt}"` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const groq = new Groq({ apiKey: groqKey });
      
      // Groq 실시간 가용 모델 동적 탐색
      let availableGroqModels: string[] = [];
      try {
        const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${groqKey}` }
        });
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          availableGroqModels = (modelsData.data || []).map((m: any) => m.id);
        }
      } catch (_e) {
        // 모델 목록 조회 실패 시 기본 모델 후보군 활용
      }

      // 후보 모델 우선순위 결정
      let targetModel = model || '';
      const candidateGroqModels: string[] = [];
      if (targetModel && availableGroqModels.includes(targetModel)) {
        candidateGroqModels.push(targetModel);
      }
      
      // 가용 모델 목록 중 매칭되는 모델 및 기본 모델 추가
      for (const mId of availableGroqModels) {
        if (!candidateGroqModels.includes(mId)) {
          candidateGroqModels.push(mId);
        }
      }
      
      // 만약 목록이 비어있으면 기본 후보군 사용
      if (candidateGroqModels.length === 0) {
        candidateGroqModels.push(
          'llama-3.1-8b-instant',
          'llama-3.3-70b-versatile',
          'llama3-70b-8192',
          'gemma2-9b-it'
        );
      }

      let lastGroqError: any = null;
      let groqText: string | null = null;

      // 사용 가능한 Groq 모델 순차 호출
      for (const currentGroqModel of candidateGroqModels) {
        try {
          const chatCompletion = await groq.chat.completions.create({
            messages: [
              { role: 'system', content: effectiveSystemPrompt },
              { role: 'user', content: prompt }
            ],
            model: currentGroqModel,
          });

          groqText = chatCompletion.choices[0]?.message?.content || null;
          if (groqText) {
            break;
          }
        } catch (err: any) {
          lastGroqError = err;
          continue;
        }
      }

      if (groqText !== null) {
        return new Response(
          JSON.stringify({ response: groqText }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ response: `[Groq 오류] ${lastGroqError?.message || 'Groq 모델 응답 생성에 실패했습니다.'}` }),
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

      // OpenRouter 실시간 무료 모델 동적 탐색
      let availableFreeModels: string[] = [];
      try {
        const orModelsRes = await fetch('https://openrouter.ai/api/v1/models');
        if (orModelsRes.ok) {
          const orData = await orModelsRes.json();
          availableFreeModels = (orData.data || [])
            .map((m: any) => m.id)
            .filter((id: string) => id.endsWith(':free'));
        }
      } catch (_e) {
        // 목록 조회 실패 시 기본 후보군 활용
      }

      const candidateModels: string[] = [];
      if (model && availableFreeModels.includes(model)) {
        candidateModels.push(model);
      }
      
      // 실시간 무료 모델 추가
      for (const freeId of availableFreeModels) {
        if (!candidateModels.includes(freeId)) {
          candidateModels.push(freeId);
        }
      }

      // 기본 폴백 무료 모델 목록
      const fallbackList = [
        'qwen/qwen-2.5-coder-32b-instruct:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'google/gemma-2-9b-it:free',
        'meta-llama/llama-3.2-3b-instruct:free',
        'meta-llama/llama-3.2-1b-instruct:free',
        'deepseek/deepseek-chat:free'
      ];
      for (const fb of fallbackList) {
        if (!candidateModels.includes(fb)) {
          candidateModels.push(fb);
        }
      }

      let lastErrorMsg = '';
      let responseText: string | null = null;

      // 사용 가능한 무료 모델을 순차적으로 시도
      for (const currentModel of candidateModels) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openrouterKey}`,
              'HTTP-Referer': 'http://localhost:4200',
              'X-Title': 'DevelopAgent',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: currentModel,
              messages: [
                { role: 'system', content: effectiveSystemPrompt },
                { role: 'user', content: prompt }
              ]
            })
          });

          const data = await res.json();
          if (res.ok && data.choices?.[0]?.message?.content) {
            responseText = data.choices[0].message.content;
            break;
          } else {
            lastErrorMsg = data?.error?.message || data?.message || '응답 생성 실패';
          }
        } catch (err: any) {
          lastErrorMsg = err?.message || '네트워크 호출 실패';
        }
      }

      if (responseText !== null) {
        return new Response(
          JSON.stringify({ response: responseText }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ response: `[OpenRouter 오류] ${lastErrorMsg || 'OpenRouter 무료 모델 응답 생성에 실패했습니다.'}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
        
        // Google Gemini 실시간 가용 모델 동적 탐색
        let availableGeminiModels: string[] = [];
        try {
          const geminiListRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
          if (geminiListRes.ok) {
            const listData = await geminiListRes.json();
            availableGeminiModels = (listData.models || [])
              .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
              .map((m: any) => m.name.replace(/^models\//, ''));
          }
        } catch (_e) {
          // 조회 실패 시 기본 후보군 활용
        }

        const candidateGeminiModels: string[] = [];
        // 사용자가 요청한 모델과 유사한 모델 우선 추가
        const isPro = model?.includes('pro');
        if (isPro) {
          const proModels = availableGeminiModels.filter(m => m.includes('pro'));
          candidateGeminiModels.push(...proModels);
        } else {
          const flashModels = availableGeminiModels.filter(m => m.includes('flash'));
          candidateGeminiModels.push(...flashModels);
        }

        // 전체 가용 모델 추가
        for (const gm of availableGeminiModels) {
          if (!candidateGeminiModels.includes(gm)) {
            candidateGeminiModels.push(gm);
          }
        }

        // 가용 모델 조회가 안될 경우 기본 폴백
        if (candidateGeminiModels.length === 0) {
          candidateGeminiModels.push(
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash-002',
            'gemini-1.5-flash-8b',
            'gemini-1.5-flash',
            'gemini-1.5-pro-latest',
            'gemini-1.5-pro'
          );
        }

        let lastError: any = null;
        let responseText: string | null = null;

        // 실시간 가용 모델 순차 시도
        for (const candidate of candidateGeminiModels) {
          try {
            const geminiModel = genAI.getGenerativeModel({ 
              model: candidate,
              systemInstruction: effectiveSystemPrompt
            });

            const result = await geminiModel.generateContent(prompt);
            responseText = await result.response.text();
            if (responseText) {
              break;
            }
          } catch (err: any) {
            lastError = err;
            continue;
          }
        }

        if (responseText !== null) {
          return new Response(
            JSON.stringify({ response: responseText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ response: `[Gemini 오류] ${lastError?.message || 'Gemini 가용 모델 응답 생성에 실패했습니다.'}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
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
