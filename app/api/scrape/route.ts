import { NextResponse } from 'next/server';
import axios from 'axios';
import { parseISO, isWithinInterval } from 'date-fns';
import { XMLParser } from 'fast-xml-parser';

export async function POST(request: Request) {
  try {
    const { url, keyword, startDate, endDate } = await request.json();

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

    // RSS URL 생성
    const rssUrl = `https://rss.blog.naver.com/${blogId}`;
    console.log('RSS URL:', rssUrl);

    try {
      // RSS 피드 가져오기
      const response = await axios.get(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      
      const xmlData = response.data;
      
      // XML 파싱
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
      });
      const result = parser.parse(xmlData);
      
      // 블로그 이름 추출
      const blogName = result.rss?.channel?.title || '네이버 블로그';
      
      // 포스트 추출
      let posts = [];
      if (result.rss?.channel?.item) {
        const items = Array.isArray(result.rss.channel.item) 
          ? result.rss.channel.item 
          : [result.rss.channel.item];
        
        posts = items.map((item: any) => {
          // RSS의 pubDate 형식은 "Fri, 28 Jun 2024 12:00:00 +0900" 같은 형태
          const pubDate = new Date(item.pubDate);
          const formattedDate = pubDate.toISOString().split('T')[0]; // YYYY-MM-DD 포맷
          
          return {
            title: item.title,
            url: item.link,
            date: formattedDate,
            content: '', // RSS에는 전체 내용이 없으므로 별도로 가져와야 함
            description: item.description || ''
          };
        });
      }
      
      // 키워드 및 날짜 필터링
      const filteredPosts = filterPosts(posts, keyword, startDate, endDate);
      console.log(`필터링 후 포스트 수: ${filteredPosts.length}`);

      return NextResponse.json({
        blogName,
        posts: filteredPosts,
      });
    } catch (error: any) {
      console.error('블로그 스크랩 에러:', error.message);
      
      // RSS가 제공되지 않는 경우 대체 방법으로 더미 데이터 제공
      if (error.response && error.response.status === 404) {
        console.log('RSS 피드를 찾을 수 없습니다. 대체 데이터를 사용합니다.');
        const blogName = await getBlogNameFromUrl(url);
        const dummyPosts = generateDummyPosts(url, 5);
        const filteredPosts = filterPosts(dummyPosts, keyword, startDate, endDate);
        
        return NextResponse.json({
          blogName,
          posts: filteredPosts,
          warning: '이 블로그의 RSS 피드를 찾을 수 없습니다. 테스트 데이터가 표시됩니다.'
        });
      }
      
      return NextResponse.json(
        { error: '블로그 데이터를 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('요청 처리 에러:', error.message);
    return NextResponse.json(
      { error: '요청을 처리하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

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

// 테스트용 더미 포스트 생성 (RSS가 없는 경우 대체용)
function generateDummyPosts(blogUrl: string, count: number) {
  const posts = [];
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    posts.push({
      title: `RSS를 찾을 수 없는 블로그 포스트 ${i + 1}`,
      url: `${blogUrl}#dummy-${i}`,
      date: date.toISOString().split('T')[0],
      content: '',
      description: '이 블로그는 RSS 피드를 제공하지 않습니다. 실제 블로그를 방문해 주세요.'
    });
  }
  
  return posts;
}

// 포스트 필터링
function filterPosts(posts: any[], keyword?: string, startDate?: string, endDate?: string) {
  return posts.filter((post) => {
    let isMatch = true;

    // 키워드 필터링
    if (keyword && keyword.trim() !== '') {
      const lowerKeyword = keyword.toLowerCase();
      isMatch = post.title.toLowerCase().includes(lowerKeyword) || 
                (post.description && post.description.toLowerCase().includes(lowerKeyword));
    }

    // 날짜 필터링
    if (isMatch && startDate && endDate) {
      try {
        const postDate = parseISO(post.date);
        const filterStartDate = parseISO(startDate);
        const filterEndDate = parseISO(endDate);

        isMatch = isWithinInterval(postDate, {
          start: filterStartDate,
          end: filterEndDate,
        });
      } catch (error) {
        console.error('날짜 필터링 오류:', error);
      }
    }

    return isMatch;
  });
} 