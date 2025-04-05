import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { promises as fs } from 'fs';
import { join } from 'path';

interface SourceSheet {
  url: string;
  sheetName: string;
  titleColumn: string;
  contentColumn: string;
  linkColumn?: string;
}

interface OutputSheet {
  sheetName: string;
  titleColumn: string;
  contentColumn: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sourceSheet,
      outputSheet,
      template,
      apiKey,
    } = body;

    // 구글 인증 정보 읽기
    const envPath = join(process.cwd(), '.env.local');
    let credentials;

    try {
      const envContent = await fs.readFile(envPath, 'utf-8');
      const credentialsMatch = envContent.match(/GOOGLE_CREDENTIALS=(.+)/);
      if (!credentialsMatch) {
        throw new Error('구글 서비스 계정 인증 정보가 없습니다.');
      }
      credentials = JSON.parse(credentialsMatch[1]);
    } catch (error) {
      throw new Error('구글 인증 정보를 읽는데 실패했습니다.');
    }

    // 구글 시트 API 클라이언트 생성
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 소스 시트에서 데이터 읽기
    const sourceSheetId = sourceSheet.url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    if (!sourceSheetId) {
      throw new Error('유효한 구글 시트 URL이 아닙니다.');
    }

    // URL 열을 포함하도록 범위 수정
    const lastColumn = 'H'; // H열까지 읽도록 고정
    
    const sourceRange = `${sourceSheet.sheetName}!${sourceSheet.titleColumn}:${lastColumn}`;
    const sourceResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sourceSheetId,
      range: sourceRange,
    });

    const rows = sourceResponse.data.values || [];
    const headerRow = rows[0] || []; // 헤더 행
    const dataRows = rows.slice(1); // 첫 번째 행은 건너뛰기

    // 헤더에서 {문자} 형태의 변수 찾기
    const variableColumns = new Map<string, number>();
    headerRow.forEach((header: string, index: number) => {
      const match = header.match(/^{(.+)}$/);
      if (match) {
        variableColumns.set(match[1], index);
      }
    });

    // 출력 시트의 기존 데이터 확인
    const outputRange = `${outputSheet.sheetName}!${outputSheet.titleColumn}:${outputSheet.contentColumn}`;
    const existingOutputResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sourceSheetId,
      range: outputRange,
    });

    const existingOutputRows = existingOutputResponse.data.values || [];
    const processedRows = [['제목', '가공된 내용']];
    
    // 처리해야 할 총 항목 수 계산 (이미 처리된 항목 제외)
    const unprocessedRows = dataRows.filter((_, index) => !existingOutputRows[index + 1]?.[0] || !existingOutputRows[index + 1]?.[1]);
    const totalToProcess = unprocessedRows.length;
    let processedCount = 0;

    // 스트림 응답 생성
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // 진행 상황 전송 함수
    const sendProgress = async (current: number, total: number, processed: number) => {
      const progressData = {
        current,
        total,
        processed,
        type: 'progress'
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`));
    };

    // 응답 시작
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    // 비동기 처리 시작
    (async () => {
      try {
        // 초기 진행 상황 전송
        await sendProgress(0, totalToProcess, 0);

        // GPT API를 사용하여 각 행 처리
        let currentProgress = 0;
        for (let i = 0; i < dataRows.length; i++) {
          const [title, content] = dataRows[i];

          // 이미 결과가 있는 경우 건너뛰기
          if (existingOutputRows[i + 1]?.[0] && existingOutputRows[i + 1]?.[1]) {
            processedRows.push(existingOutputRows[i + 1]);
            continue;
          }

          // 프롬프트 템플릿 적용
          let systemPrompt = template.system
            .replace(/{title}/g, title || '')
            .replace(/{content}/g, content || '')
            .replace(/{url}/g, dataRows[i][2] || ''); // URL은 세 번째 열에서 가져옴

          // 동적 변수 치환
          variableColumns.forEach((columnIndex, variableName) => {
            const value = dataRows[i][columnIndex] || '';
            systemPrompt = systemPrompt.replace(new RegExp(`{${variableName}}`, 'g'), value);
          });

          // GPT API 호출
          const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: template.model,
              messages: [{ role: 'system', content: systemPrompt }],
              temperature: template.temperature,
              top_p: template.top_p,
              presence_penalty: template.presence_penalty,
              frequency_penalty: template.frequency_penalty,
              max_tokens: template.max_tokens,
            }),
          });

          if (!gptResponse.ok) {
            const error = await gptResponse.json();
            throw new Error(error.error?.message || 'GPT API 호출 중 오류가 발생했습니다.');
          }

          const result = await gptResponse.json();
          const generatedContent = result.choices[0].message.content;
          
          // 결과물을 제목과 내용으로 분리
          const contentLines = generatedContent.trim().split('\n');
          // HTML 태그 제거 및 마크다운 '#' 제거
          const generatedTitle = contentLines[0]
            .replace(/<[^>]+>/g, '') // HTML 태그 제거
            .replace(/^#\s*/, '') // 마크다운 '#' 제거
            .trim();
          const generatedBody = contentLines.slice(1).join('\n').trim();
          
          processedRows.push([generatedTitle, generatedBody]);
          processedCount++;
          currentProgress++;

          // 진행 상황 전송 (이미 처리된 항목 제외)
          await sendProgress(currentProgress, totalToProcess, processedCount);
        }

        // 결과를 출력 시트에 저장
        await sheets.spreadsheets.values.update({
          spreadsheetId: sourceSheetId,
          range: outputRange,
          valueInputOption: 'RAW',
          requestBody: {
            values: processedRows,
          },
        });

        // 완료 메시지 전송
        const completionData = {
          type: 'complete',
          success: true,
          total: totalToProcess,
          processed: processedCount,
        };
        await writer.write(encoder.encode(`data: ${JSON.stringify(completionData)}\n\n`));
      } catch (error) {
        // 오류 메시지 전송
        const errorData = {
          type: 'error',
          error: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.',
        };
        await writer.write(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return response;
  } catch (error) {
    console.error('컨텐츠 가공 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 