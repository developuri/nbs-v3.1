import { NextResponse } from 'next/server';
import OpenAI from 'openai';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  messages: Message[];
  model: string;
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
  max_tokens: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, model, temperature, top_p, presence_penalty, frequency_penalty, max_tokens } = body;

    // API 키 확인
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API 키가 필요합니다.' },
        { status: 400 }
      );
    }

    // OpenAI 클라이언트 초기화
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // GPT API 호출
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      top_p,
      presence_penalty,
      frequency_penalty,
      max_tokens,
    });

    return NextResponse.json({
      content: completion.choices[0]?.message?.content || '',
    });
  } catch (error) {
    console.error('GPT API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'GPT API 요청 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 