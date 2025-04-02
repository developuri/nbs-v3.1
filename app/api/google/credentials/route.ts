import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: '인증 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // 파일 내용을 읽어서 JSON 파싱
    const fileContent = await file.text();
    let credentials;
    try {
      credentials = JSON.parse(fileContent);
    } catch (error) {
      return NextResponse.json(
        { error: '유효하지 않은 JSON 파일입니다.' },
        { status: 400 }
      );
    }

    // JSON을 한 줄 문자열로 변환
    const credentialsString = JSON.stringify(credentials);
    
    // .env.local 파일 경로
    const envPath = join(process.cwd(), '.env.local');
    
    try {
      // 기존 .env.local 파일 내용을 읽거나 새로 만들기
      let envContent = '';
      try {
        envContent = await (await import('fs')).promises.readFile(envPath, 'utf-8');
      } catch (error) {
        // 파일이 없는 경우 무시
      }

      // GOOGLE_CREDENTIALS 라인 찾기 또는 추가
      const lines = envContent.split('\n');
      const credentialLineIndex = lines.findIndex(line => 
        line.startsWith('GOOGLE_CREDENTIALS=')
      );

      if (credentialLineIndex >= 0) {
        // 기존 라인 업데이트
        lines[credentialLineIndex] = `GOOGLE_CREDENTIALS=${credentialsString}`;
      } else {
        // 새 라인 추가
        lines.push(`GOOGLE_CREDENTIALS=${credentialsString}`);
      }

      // 파일 저장
      await writeFile(envPath, lines.join('\n'));

      return NextResponse.json({ 
        message: '인증 정보가 성공적으로 저장되었습니다.' 
      });
    } catch (error) {
      console.error('파일 저장 오류:', error);
      return NextResponse.json(
        { error: '인증 정보 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('요청 처리 오류:', error);
    return NextResponse.json(
      { error: '요청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 