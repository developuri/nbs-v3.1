import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { promises as fs } from 'fs';
import { join } from 'path';

export async function GET(request: Request) {
  try {
    // URL에서 쿼리 파라미터 추출
    const url = new URL(request.url);
    const sheetUrl = url.searchParams.get('sheetUrl');
    const sheetName = url.searchParams.get('sheetName');
    const titleColumn = url.searchParams.get('titleColumn');
    const contentColumn = url.searchParams.get('contentColumn');
    const linkColumn = url.searchParams.get('linkColumn');

    // 필수 파라미터 검증
    if (!sheetUrl || !sheetName || !titleColumn || !contentColumn || !linkColumn) {
      throw new Error('필수 시트 정보가 누락되었습니다.');
    }

    // .env.local 파일에서 인증 정보 읽기
    const envPath = join(process.cwd(), '.env.local');
    let credentials;

    try {
      const envContent = await fs.readFile(envPath, 'utf-8');
      
      // 구글 인증 정보 파싱
      const credentialsMatch = envContent.match(/GOOGLE_CREDENTIALS=(.+)/);
      if (!credentialsMatch) {
        throw new Error('구글 서비스 계정 인증 정보가 없습니다.');
      }
      credentials = JSON.parse(credentialsMatch[1]);
    } catch (error) {
      throw new Error('구글 인증 정보를 읽는데 실패했습니다.');
    }

    // 시트 ID 추출
    const sheetIdMatch = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!sheetIdMatch || !sheetIdMatch[1]) {
      throw new Error('유효한 구글 시트 URL이 아닙니다.');
    }
    const spreadsheetId = sheetIdMatch[1];

    // 구글 시트 API 클라이언트 생성
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 데이터 범위 계산
    const range = `${sheetName}!${titleColumn}:${linkColumn}`;

    // 시트 데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values || [];

    // 데이터를 객체 배열로 변환
    const rows = values.map(row => ({
      title: row[0] || '',
      content: row[1] || '',
      url: row[2] || '',
    }));

    return NextResponse.json({ rows });
  } catch (error) {
    console.error('구글 시트 데이터 가져오기 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '데이터를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 