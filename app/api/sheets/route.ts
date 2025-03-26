import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// 서비스 계정 정보
// 실제 애플리케이션에서는 환경 변수로 관리해야 합니다.
const SERVICE_ACCOUNT = {
  // 서비스 계정 정보를 여기에 추가
  // 실제 서비스 계정 키는 환경 변수로 관리하고 여기에 직접 넣지 마세요.
};

interface SheetRequestBody {
  sheetUrl: string;
  sheetName: string;
  titleColumn: string;
  contentColumn: string;
  posts: {
    id: string;
    blogId: string;
    title: string;
    content: string;
    url: string;
    date: string;
  }[];
}

export async function POST(request: Request) {
  try {
    const body: SheetRequestBody = await request.json();
    const { sheetUrl, sheetName, titleColumn, contentColumn, posts } = body;

    // 시트 URL에서 시트 ID 추출
    const sheetIdMatch = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!sheetIdMatch || !sheetIdMatch[1]) {
      return NextResponse.json({ 
        success: false, 
        error: '유효한 구글 시트 URL이 아닙니다.' 
      }, { status: 400 });
    }
    const spreadsheetId = sheetIdMatch[1];

    // 시트 범위 계산 (예: A:B, B:C 등)
    const range = `${sheetName}!${titleColumn}:${contentColumn}`;

    // JWT 클라이언트 생성
    // 실제 구현에서는 서비스 계정 키를 환경 변수로부터 가져와야 합니다.
    // 이 예제에서는 간단한 구현을 위해 임시로 처리합니다.
    const auth = new google.auth.GoogleAuth({
      // 환경 변수 또는 서비스 계정 정보 사용
      credentials: process.env.GOOGLE_SERVICE_ACCOUNT_KEY 
        ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
        : SERVICE_ACCOUNT,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 데이터 준비 (2차원 배열로 변환)
    const values = posts.map(post => {
      // 각 열에 맞게 데이터 배치
      const rowData: string[] = [];
      
      // 열 순서에 따라 데이터 배치
      const columns = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      const titleColIndex = columns.indexOf(titleColumn);
      const contentColIndex = columns.indexOf(contentColumn);
      
      // 배열을 필요한 크기로 초기화
      const maxIndex = Math.max(titleColIndex, contentColIndex);
      for (let i = 0; i <= maxIndex; i++) {
        rowData.push('');
      }
      
      // 제목과 내용 할당
      rowData[titleColIndex] = post.title;
      rowData[contentColIndex] = post.content;
      
      return rowData;
    });

    // 데이터를 시트에 추가
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: `${posts.length}개의 포스트가 성공적으로 시트에 추가되었습니다.`,
      updatedRows: response.data.updates?.updatedRows || 0
    });

  } catch (error: any) {
    console.error('구글 시트 API 오류:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || '구글 시트에 데이터를 저장하는 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 