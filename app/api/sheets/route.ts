import { google } from 'googleapis';
import { NextResponse } from 'next/server';

interface SheetData {
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
    // FormData 처리
    const formData = await request.formData();
    
    // 인증 파일 가져오기
    const credentialsFile = formData.get('credentials') as File;
    if (!credentialsFile) {
      return NextResponse.json({ 
        success: false, 
        error: '구글 서비스 계정 인증 파일이 없습니다.' 
      }, { status: 400 });
    }
    
    // 인증 파일 내용 읽기
    const credentialsBuffer = await credentialsFile.arrayBuffer();
    const credentialsText = new TextDecoder().decode(credentialsBuffer);
    
    // JSON 파싱 시도
    let credentials;
    try {
      credentials = JSON.parse(credentialsText);
    } catch (e) {
      return NextResponse.json({ 
        success: false, 
        error: '유효한 JSON 형식의 인증 파일이 아닙니다.' 
      }, { status: 400 });
    }
    
    // 필수 필드 확인
    if (!credentials.client_email || !credentials.private_key) {
      return NextResponse.json({ 
        success: false, 
        error: '인증 파일에 필수 필드(client_email, private_key)가 없습니다.' 
      }, { status: 400 });
    }
    
    // 데이터 필드 가져오기
    const dataField = formData.get('data');
    if (!dataField) {
      return NextResponse.json({ 
        success: false, 
        error: '시트 데이터가 없습니다.' 
      }, { status: 400 });
    }
    
    // 데이터 파싱
    const data: SheetData = JSON.parse(dataField as string);
    const { sheetUrl, sheetName, titleColumn, contentColumn, posts } = data;
    
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
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 기존 시트 데이터 가져오기
    const existingDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${titleColumn}:${titleColumn}`, // 제목 열만 가져오기
    });

    // 기존 제목 목록 추출
    const existingTitles: string[] = [];
    const existingValues = existingDataResponse.data.values || [];
    existingValues.forEach(row => {
      if (row[0]) {
        existingTitles.push(row[0].toString());
      }
    });

    // 중복 데이터 필터링
    const filteredPosts = posts.filter(post => !existingTitles.includes(post.title));

    // 필터링 결과가 없으면 종료
    if (filteredPosts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '새로운 데이터가 없습니다. 모든 포스트가 이미 시트에 있습니다.',
        updatedRows: 0,
        skippedRows: posts.length
      });
    }

    // 데이터 준비 (2차원 배열로 변환)
    const values = filteredPosts.map(post => {
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

    const skippedRows = posts.length - filteredPosts.length;
    
    return NextResponse.json({ 
      success: true, 
      message: `${filteredPosts.length}개의 새 포스트가 성공적으로 시트에 추가되었습니다.${skippedRows > 0 ? ` (${skippedRows}개의 중복 포스트 건너뜀)` : ''}`,
      updatedRows: response.data.updates?.updatedRows || 0,
      skippedRows
    });

  } catch (error: any) {
    console.error('구글 시트 API 오류:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || '구글 시트에 데이터를 저장하는 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 