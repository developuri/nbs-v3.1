import { NextResponse } from 'next/server';
import axios from 'axios';

// 블로그 ID 추출
function extractBlogId(url: string): string | null {
  // blog.naver.com/아이디 형식에서 아이디 추출
  const blogIdMatch = url.match(/blog\.naver\.com\/([^\/\?]+)/);
  if (blogIdMatch && blogIdMatch[1]) {
    return blogIdMatch[1];
  }
  
  // blogId=아이디 형식에서 아이디 추출
  const blogIdParamMatch = url.match(/blogId=([^&]+)/);
  if (blogIdParamMatch && blogIdParamMatch[1]) {
    return blogIdParamMatch[1];
  }
  
  return null;
}

// 블로그 URL에서 블로그 이름 가져오기
async function getBlogNameFromUrl(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000
    });
    
    const html = response.data;
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    return titleMatch 
      ? titleMatch[1].trim().replace(/ [:|-] 네이버 블로그.*$/, '')
      : '네이버 블로그';
  } catch (error) {
    return '네이버 블로그';
  }
}

export async function GET(request: Request) {
  try {
    // URL에서 url 파라미터 추출
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: '블로그 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // 네이버 블로그 URL 검증
    if (!url.includes('blog.naver.com')) {
      return NextResponse.json(
        { error: '네이버 블로그 URL만 지원합니다.' },
        { status: 400 }
      );
    }

    // 블로그 ID 추출
    const blogId = extractBlogId(url);
    if (!blogId) {
      return NextResponse.json(
        { error: '유효한 네이버 블로그 URL이 아닙니다.' },
        { status: 400 }
      );
    }

    // 블로그 이름 가져오기
    const blogName = await getBlogNameFromUrl(url);

    // 블로그 이름만 응답으로 반환
    return NextResponse.json({
      blogName,
      url
    });

  } catch (error: any) {
    console.error('요청 처리 에러:', error.message);
    return NextResponse.json(
      { error: '요청을 처리하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 