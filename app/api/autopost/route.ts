import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { promises as fs } from 'fs';
import { join } from 'path';
import axios from 'axios';

interface GoogleSheetInfo {
  sheetId: string;
  sheetUrl: string;
  sheetName: string;
  titleColumn: string;
  contentColumn: string;
  linkColumn: string;
  credentials: string;
}

interface AutoPostingSettings {
  sheetName: string;
  titleColumn: string;
  contentColumn: string;
  scheduleColumn: string;
  resultColumn: string;
  urlColumn: string;
  selectedBlogId: string;
}

interface WordPressBlog {
  id: string;
  name: string;
  url: string;
  username: string;
  appPassword: string;
}

interface WordPressPost {
  title: string;
  content: string;
  status: 'publish' | 'future';
  date?: string;
}

interface RequestBody {
  settings: AutoPostingSettings;
  blogInfo: {
    selectedBlog: WordPressBlog;
    googleSheetInfo: GoogleSheetInfo;
  };
}

export async function POST(request: Request) {
  try {
    const { settings, blogInfo }: RequestBody = await request.json();
    const { selectedBlog, googleSheetInfo } = blogInfo;
    
    // 1. 구글 시트 인증 정보 읽기
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

    // 2. 구글 시트 API 클라이언트 생성
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 3. 구글 시트에서 데이터 읽기
    // 범위 형식: '시트이름'!A:H (전체 범위를 읽어오도록 수정)
    const range = `'${settings.sheetName}'!A:H`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: googleSheetInfo.sheetId,
      range,
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1); // 첫 번째 행은 건너뛰기

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
    const responseStream = new Response(stream.readable, {
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
        await sendProgress(0, dataRows.length, 0);
        let processedCount = 0;

        // 열 인덱스를 문자에서 숫자로 변환하는 함수
        const getColumnIndex = (column: string) => {
          return column.charCodeAt(0) - 65;  // A=0, B=1, C=2, ...
        };

        const columnIndexes = {
          title: getColumnIndex(settings.titleColumn),
          content: getColumnIndex(settings.contentColumn),
          schedule: settings.scheduleColumn ? getColumnIndex(settings.scheduleColumn) : -1,
          result: settings.resultColumn ? getColumnIndex(settings.resultColumn) : -1,
          url: settings.urlColumn ? getColumnIndex(settings.urlColumn) : -1,
        };

        // 각 행에 대해 워드프레스 포스팅 처리
        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          
          // 이미 발행된 포스트는 건너뛰기
          if (row[columnIndexes.result] === 'Y') {
            await sendProgress(i + 1, dataRows.length, processedCount);
            continue;
          }

          try {
            if (!row[columnIndexes.title] || !row[columnIndexes.content]) {
              throw new Error(`제목 또는 내용이 비어있습니다. (행: ${i + 1}, 제목: ${settings.titleColumn}열, 내용: ${settings.contentColumn}열)`);
            }

            const post: WordPressPost = {
              title: row[columnIndexes.title],
              content: row[columnIndexes.content],
              status: 'publish'
            };

            // 예약발행 시간이 있는 경우 처리
            if (columnIndexes.schedule >= 0 && row[columnIndexes.schedule]) {
              try {
                // 날짜 형식 변환 (예: "2024. 4. 4 오후 7:00:00" -> ISO 형식)
                const koreanDate = row[columnIndexes.schedule].toString().trim();
                const [datePart, timePart] = koreanDate.split(/\s+(?=오전|오후)/);
                
                // 날짜 부분 처리
                const [year, month, day] = datePart.split('.').map(part => part.trim());
                
                // 시간 부분 처리
                const [ampm, time] = timePart.split(/\s+/);
                const [hours, minutes] = time.split(':').map(Number);
                
                // 24시간 형식으로 변환
                let hour = hours;
                if (ampm === '오후' && hours < 12) hour += 12;
                if (ampm === '오전' && hours === 12) hour = 0;

                const scheduleDate = new Date(
                  parseInt(year),
                  parseInt(month) - 1,  // 월은 0부터 시작
                  parseInt(day),
                  hour,
                  minutes
                );

                console.log('예약발행 시간 처리:', {
                  original: koreanDate,
                  parsed: scheduleDate,
                  iso: scheduleDate.toISOString()
                });

                // 현재 시간보다 미래인 경우에만 예약발행 설정
                if (scheduleDate > new Date()) {
                  post.status = 'future';
                  post.date = scheduleDate.toISOString();
                  console.log('예약발행 설정됨:', {
                    status: post.status,
                    date: post.date
                  });
                }
              } catch (dateError) {
                console.error('날짜 형식 변환 오류:', {
                  value: row[columnIndexes.schedule],
                  error: dateError
                });
                // 날짜 형식이 잘못된 경우 즉시 발행
                post.status = 'publish';
              }
            }

            // 워드프레스 API로 포스트 발행
            const credentials = btoa(`${selectedBlog.username}:${selectedBlog.appPassword}`);
            
            console.log('워드프레스 API 요청:', {
              url: `${selectedBlog.url}/wp-json/wp/v2/posts`,
              title: post.title,
              contentLength: post.content.length,
              status: post.status,
              date: post.date
            });

            try {
              const wpResponse = await axios.post(
                `${selectedBlog.url}/wp-json/wp/v2/posts`,
                {
                  title: {
                    rendered: post.title,
                    raw: post.title
                  },
                  content: {
                    rendered: post.content,
                    raw: post.content
                  },
                  status: post.status,
                  date: post.date
                },
                {
                  headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/json',
                  }
                }
              );

              // 발행 결과 및 URL 업데이트
              if (columnIndexes.result >= 0) {
                await sheets.spreadsheets.values.update({
                  spreadsheetId: googleSheetInfo.sheetId,
                  range: `${settings.sheetName}!${settings.resultColumn}${i + 2}`,
                  valueInputOption: 'RAW',
                  requestBody: {
                    values: [['Y']]
                  }
                });
              }

              if (columnIndexes.url >= 0 && wpResponse.data.link) {
                await sheets.spreadsheets.values.update({
                  spreadsheetId: googleSheetInfo.sheetId,
                  range: `${settings.sheetName}!${settings.urlColumn}${i + 2}`,
                  valueInputOption: 'RAW',
                  requestBody: {
                    values: [[wpResponse.data.link]]
                  }
                });
              }

              console.log('시트 업데이트 완료:', {
                row: i + 2,
                result: 'Y',
                url: wpResponse.data.link
              });

              // 발행 성공 시 카운트 증가 및 진행 상황 전송
              processedCount++;
              await sendProgress(i + 1, dataRows.length, processedCount);

            } catch (wpError: any) {
              console.error('워드프레스 API 에러:', {
                status: wpError.response?.status,
                statusText: wpError.response?.statusText,
                data: wpError.response?.data,
                url: selectedBlog.url,
                username: selectedBlog.username
              });

              throw new Error(
                wpError.response?.data?.message || 
                `워드프레스 API 에러 (${wpError.response?.status}): ${wpError.response?.statusText}`
              );
            }
          } catch (error: any) {
            console.error('포스팅 오류:', error);
            // 오류 발생 시에도 진행 상황 업데이트
            await sendProgress(i + 1, dataRows.length, processedCount);
          }
        }

        // 완료 메시지 전송
        const completionData = {
          type: 'complete',
          success: true,
          total: dataRows.length,
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

    return responseStream;

  } catch (error: any) {
    console.error('자동 포스팅 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '자동 포스팅 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 