import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import * as jsdom from 'jsdom';
import { parse, isAfter, parseISO } from 'date-fns';

// DOM 파싱 기반 스마트에디터 본문 추출 함수 (기존 코드와 동일)
const extractSmartEditorContentDOM = (htmlContent: string): string => {
  console.log('DOM 파싱 기반 스마트에디터 내부 컨텐츠 추출 시도');
  
  try {
    // JSDOM을 사용하여 서버사이드에서 DOM 파싱
    const dom = new jsdom.JSDOM(htmlContent);
    const document = dom.window.document;
    
    // 메인 컨테이너 찾기
    const container = document.querySelector('.se-main-container');
    if (!container) {
      console.log('스마트에디터 메인 컨테이너 찾지 못함 (DOM)');
      return '';
    }
    
    let content = '';
    
    // 1. 텍스트 단락 처리 - 주요 컨텐츠
    const paragraphs = Array.from(container.querySelectorAll('.se-text-paragraph'));
    if (paragraphs.length > 0) {
      console.log(`스마트에디터 텍스트 단락 ${paragraphs.length}개 발견 (DOM)`);
      
      const paragraphTexts = paragraphs
        .map(p => p.textContent?.trim())
        .filter(t => t && t.length > 0)
        .join('\n\n');
      
      content += paragraphTexts;
    }
    
    // 이미지 모듈은 텍스트 본문만 추출하도록 제외
    
    // 3. 인용구 모듈 처리
    const quoteModules = Array.from(container.querySelectorAll('.se-module-quotation'));
    if (quoteModules.length > 0) {
      console.log(`스마트에디터 인용구 모듈 ${quoteModules.length}개 발견 (DOM)`);
      
      quoteModules.forEach(quoteModule => {
        const quoteText = quoteModule.textContent?.trim();
        if (quoteText) {
          content += `\n\n${quoteText}\n\n`;
        }
      });
    }
    
    // 4. 코드 블록 모듈 처리
    const codeModules = Array.from(container.querySelectorAll('.se-module-code'));
    if (codeModules.length > 0) {
      console.log(`스마트에디터 코드 모듈 ${codeModules.length}개 발견 (DOM)`);
      
      codeModules.forEach(codeModule => {
        const codeText = codeModule.textContent?.trim();
        if (codeText) {
          content += `\n\n${codeText}\n\n`;
        }
      });
    }
    
    // 5. 표 모듈 처리 - 텍스트만 추출
    const tableModules = Array.from(container.querySelectorAll('.se-module-table'));
    if (tableModules.length > 0) {
      console.log(`스마트에디터 표 모듈 ${tableModules.length}개 발견 (DOM)`);
      
      tableModules.forEach(tableModule => {
        const tableText = tableModule.textContent?.trim();
        if (tableText) {
          content += `\n\n${tableText}\n\n`;
        }
      });
    }
    
    // 6. 구분선 모듈 처리 - 텍스트 구분선으로 대체
    const hrModules = container.querySelectorAll('.se-module-horizontalLine');
    if (hrModules.length > 0) {
      console.log(`스마트에디터 구분선 모듈 ${hrModules.length}개 발견 (DOM)`);
      
      // 텍스트 구분선으로 대체
      content = content.replace(/<div class="se-module-horizontalLine"[^>]*>[\s\S]*?<\/div>/g, '\n\n----------\n\n');
    }
    
    // 7. 그 외 모든 모듈 컨텐츠 수집 (위에서 처리되지 않은 모듈)
    if (content.length < 100) {
      console.log('주요 모듈에서 충분한 내용을 찾지 못함, 모든 모듈 처리 시도');
      
      const textModules = Array.from(container.querySelectorAll('.se-module-text'));
      if (textModules.length > 0) {
        console.log(`추가 텍스트 모듈 ${textModules.length}개 발견 (DOM)`);
        
        textModules.forEach(module => {
          const moduleText = module.textContent?.trim();
          if (moduleText && moduleText.length > 0) {
            content += `\n\n${moduleText}\n\n`;
          }
        });
      }
    }
    
    // 8. 특수 케이스: 모든 모듈 클래스를 직접 검색 (이미지 제외)
    if (content.length < 100) {
      console.log('모듈별 추출 실패, 모든 se-module 직접 처리 (이미지 제외)');
      
      const allModules = Array.from(container.querySelectorAll('.se-module:not(.se-module-image)'));
      allModules.forEach(module => {
        const moduleText = module.textContent?.trim();
        if (moduleText && moduleText.length > 10) {
          content += `\n\n${moduleText}\n\n`;
        }
      });
    }
    
    // 9. 마지막 수단: 컨테이너 전체 텍스트 (이전 방법 모두 실패 시)
    if (content.length < 100) {
      console.log('DOM 기반 모듈 추출 실패, 컨테이너 전체 텍스트 추출');
      content = container.textContent?.trim() || '';
    }
    
    console.log(`DOM 기반 스마트에디터 컨텐츠 추출 완료, 길이: ${content.length}`);
    return content;
  } catch (error) {
    console.error('DOM 파싱 오류:', error);
    return ''; // 오류 발생 시 빈 문자열 반환
  }
};

// 정규식 기반 스마트에디터 본문 추출 함수 (기존 코드와 동일)
const extractSmartEditorContentRegex = (htmlContent: string): string => {
  console.log('스마트에디터 컨텐츠 정규식 기반 추출 시도');
  
  // .se-main-container 영역 추출
  const mainContainerMatch = htmlContent.match(/<div[^>]*class="[^"]*se-main-container[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  if (!mainContainerMatch || !mainContainerMatch[1]) {
    console.log('스마트에디터 메인 컨테이너 찾지 못함 (정규식)');
    return '';
  }
  
  const mainContainer = mainContainerMatch[1];
  let content = '';
  
  // 1. 텍스트 단락 추출
  const paragraphPattern = /<p[^>]*class="[^"]*se-text-paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
  let paragraphMatch;
  let paragraphTexts = [];
  
  while ((paragraphMatch = paragraphPattern.exec(mainContainer)) !== null) {
    const paragraphHtml = paragraphMatch[1];
    // HTML 태그 제거 후 텍스트만 추출
    const textOnly = paragraphHtml.replace(/<[^>]*>/g, '').trim();
    if (textOnly && textOnly.length > 0) {
      paragraphTexts.push(textOnly);
    }
  }
  
  if (paragraphTexts.length > 0) {
    console.log(`스마트에디터 텍스트 단락 ${paragraphTexts.length}개 발견 (정규식)`);
    content += paragraphTexts.join('\n\n');
  }
  
  // (생략된 코드는 기존 파일과 동일하게 유지)
  
  console.log(`스마트에디터 컨텐츠 정규식 추출 완료, 길이: ${content.length}`);
  return content;
};

// 내용 처리 (이미지 URL 정규화 등)
function processContent(content: string): string {
  console.log('내용 처리 중');
  console.log('처리 전 컨텐츠 길이:', content.length);
  
  // 컨텐츠가 너무 짧은지 확인
  if (content.trim().length < 50) {
    console.log('컨텐츠가 너무 짧음:', content);
  }
  
  // 이미지 태그 제거
  let processed = content.replace(/<img[^>]*>/gi, '');
  
  // iframe 제거 (비디오나 임베디드 콘텐츠)
  processed = processed.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  
  // 그림 관련 div 제거
  processed = processed.replace(/<div[^>]*class="[^"]*se-module-image[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, '');
  processed = processed.replace(/<div[^>]*class="[^"]*se-image[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, '');
  processed = processed.replace(/<div[^>]*class="[^"]*embedded-image[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  
  // 불필요한 스크립트 제거
  processed = processed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 네이버의 스마트 에디터 특수 태그 처리
  processed = processed.replace(/<span class="se-fs-[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  processed = processed.replace(/<p class="se-text-paragraph[^"]*"[^>]*><span[^>]*>([\s\S]*?)<\/span><\/p>/gi, '$1\n\n');
  
  // 모든 HTML 태그 제거하고 순수 텍스트만 남기기
  processed = processed.replace(/<[^>]*>/g, '');
  
  // 연속된 공백 및 개행 정리
  processed = processed.replace(/\s{2,}/g, ' ');
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  // 빈 내용 확인 및 개행 추가
  if (processed.trim().length < 50) {
    console.log('처리 후 내용이 너무 짧음, 원본 확인 필요');
    return '블로그 포스트 내용을 찾지 못했습니다. 원본 포스트로 이동하여 확인해주세요.';
  }
  
  console.log('처리 후 컨텐츠 길이:', processed.length);
  return processed;
}

// 포스트 본문 내용 크롤링 함수
async function fetchPostContent(url: string, signal?: AbortSignal): Promise<string> {
  try {
    console.log(`포스트 본문 크롤링: ${url}`);
    
    // RSS 피드에서 온 URL이 rss 파라미터를 가진 경우 제거
    const cleanUrl = url.replace(/\?fromRss=true&trackingCode=rss$/, '');
    
    // iframe URL 생성 (네이버 블로그의 본문 접근 방식)
    const blogIdMatch = cleanUrl.match(/blog\.naver\.com\/([^\/]+)\/(\d+)/);
    if (!blogIdMatch) {
      console.log('블로그 ID 및 글 번호를 찾을 수 없음');
      return '';
    }
    
    const [, blogId, postId] = blogIdMatch;
    console.log(`추출된 블로그 ID: ${blogId}, 글 번호: ${postId}`);
    
    // iframe URL로 직접 접근
    const iframeUrl = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${postId}&iframe=postView`;
    console.log(`iframe URL 직접 요청: ${iframeUrl}`);
    
    const response = await axios.get(iframeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: signal
    });
    
    const htmlContent = response.data;
    console.log(`iframe URL 응답 길이: ${htmlContent.length}`);
    
    // 본문 추출 (Smart Editor 3.0 구조 탐지)
    let content = '';
    
    if (htmlContent.includes('se-main-container')) {
      console.log('스마트에디터 구조 발견, DOM 기반 파싱 시도');
      
      // DOM 파싱 처리 로직 직접 사용
      content = extractSmartEditorContentDOM(htmlContent);
      
      if (!content) {
        console.log('DOM 기반 파싱 실패, 정규식 방식 시도');
        content = extractSmartEditorContentRegex(htmlContent);
      }
    } else {
      console.log('일반 블로그 구조, 기본 텍스트 추출');
      // 간단한 텍스트 추출
      content = htmlContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
    
    // 내용 처리 (HTML 태그 제거 등)
    content = processContent(content);
    
    // 너무 긴 콘텐츠는 잘라내기
    // if (content.length > 2000) {
    //   content = content.substring(0, 2000) + '...';
    // }
    
    return content;
  } catch (error) {
    console.error('포스트 내용 크롤링 실패:', error);
    return '';
  }
}

// 지연 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// SSE 메시지 전송
function createSSEMessage(event: string, data: any) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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
async function getBlogNameFromUrl(url: string, signal?: AbortSignal): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000,
      signal
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
      content: '이 블로그는 RSS 피드를 제공하지 않습니다. 실제 블로그를 방문해 주세요.',
      description: '이 블로그는 RSS 피드를 제공하지 않습니다. 실제 블로그를 방문해 주세요.'
    });
  }
  
  return posts;
}

// 포스트를 키워드로 필터링 (여러 키워드 지원)
function filterPostsByKeywords(posts: any[], keywords?: string[]) {
  // 키워드가 없거나 빈 배열이면 모든 포스트 반환
  if (!keywords || keywords.length === 0) {
    return posts;
  }
  
  return posts.filter((post) => {
    // 어느 하나의 키워드라도 제목에 포함되어 있으면 true 반환 (OR 조건)
    return keywords.some(keyword => {
      if (!keyword || keyword.trim() === '') return false;
      
      const lowerKeyword = keyword.toLowerCase();
      // 제목에만 키워드가 있는지 확인 (본문 내용은 검색하지 않음)
      return post.title.toLowerCase().includes(lowerKeyword);
    });
  });
}

// 날짜 파싱 함수 추가
const parsePostDate = (dateStr: string): Date | null => {
  try {
    // 네이버 블로그 날짜 형식: "2024. 3. 21." 또는 "2024-03-21"
    if (dateStr.includes('.')) {
      return parse(dateStr, 'yyyy. M. d.', new Date());
    } else {
      return parseISO(dateStr);
    }
  } catch (error) {
    console.error('날짜 파싱 오류:', error);
    return null;
  }
};

// 날짜 필터링 함수
const isPostAfterStartDate = (postDate: string, startDate: string | null): boolean => {
  if (!startDate) return true;
  
  const parsedPostDate = parsePostDate(postDate);
  const parsedStartDate = parseISO(startDate);
  
  if (!parsedPostDate || !parsedStartDate) return true;
  
  return isAfter(parsedPostDate, parsedStartDate) || parsedPostDate.getTime() === parsedStartDate.getTime();
};

// SSE(Server-Sent Events) 스트림 핸들러
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const blogUrl = searchParams.get('url');
  const keywordsJson = searchParams.get('keywords');
  const startDate = searchParams.get('startDate');

  if (!blogUrl || !keywordsJson) {
    return new Response('블로그 URL과 키워드가 필요합니다.', { status: 400 });
  }

  // 네이버 블로그 URL 검증
  if (!blogUrl.includes('blog.naver.com')) {
    return new Response(
      createSSEMessage('error', { message: '네이버 블로그 URL만 지원합니다.' }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        status: 400
      }
    );
  }
  
  // 블로그 ID 추출
  const blogId = extractBlogId(blogUrl);
  if (!blogId) {
    return new Response(
      createSSEMessage('error', { message: '유효한 네이버 블로그 URL이 아닙니다.' }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        status: 400
      }
    );
  }
  
  // 키워드 파싱 (JSON 문자열 형태로 전달됨)
  let keywords: string[] = [];
  try {
    if (keywordsJson) {
      keywords = JSON.parse(keywordsJson);
    }
  } catch (error) {
    console.error('키워드 파싱 오류:', error);
  }
  
  // SSE 응답 헤더 설정
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  
  // 스트림 생성
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  
  // 요청 종료 감지를 위한 설정
  const abortController = new AbortController();
  const { signal } = abortController;
  
  // 클라이언트 연결 종료 감지
  const response = new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
  
  // 클라이언트 연결 종료 감지
  request.signal.addEventListener('abort', () => {
    console.log('클라이언트 연결이 종료되었습니다. 스크랩을 중지합니다.');
    abortController.abort();
  });
  
  // 안전하게 스트림에 쓰기 함수 추가
  const safeWrite = async (message: string) => {
    // 연결이 끊겼으면 쓰기 시도하지 않음
    if (signal.aborted) return;
    
    try {
      await writer.write(encoder.encode(message));
    } catch (error) {
      // 스트림 닫힘 오류 무시
      if (error instanceof TypeError && error.message.includes('WritableStream is closed')) {
        console.log('스트림이 이미 닫혔습니다.');
      } else if (error instanceof Error && error.name === 'ResponseAborted') {
        console.log('응답이 중단되었습니다.');
      } else {
        console.error('스트림 쓰기 오류:', error);
      }
      
      // 스트림 닫힘 오류가 발생하면 abort 처리
      if (!signal.aborted) {
        abortController.abort();
      }
    }
  };

  // 비동기 작업 시작
  (async () => {
    try {
      // 시작 이벤트 전송
      await safeWrite(createSSEMessage('start', { message: '스크랩을 시작합니다.' }));
      
      // RSS URL 생성
      const rssUrl = `https://rss.blog.naver.com/${blogId}`;
      console.log('RSS URL:', rssUrl);
      
      // RSS 피드 가져오기 (signal 전달)
      const response = await axios.get(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000,
        signal
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
      
      // 진행 상황 업데이트
      await safeWrite(createSSEMessage('blog', { blogName }));
      
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
            content: '', // 초기값은 빈 문자열, 나중에 채움
            description: item.description || ''
          };
        });
      }
      
      // 키워드 필터링
      const filteredPosts = filterPostsByKeywords(posts, keywords);
      console.log(`필터링 후 포스트 수: ${filteredPosts.length}`);
      
      // 날짜 필터링 추가
      const dateFilteredPosts = filteredPosts.filter(post => isPostAfterStartDate(post.date, startDate));
      console.log(`날짜 필터링 후 포스트 수: ${dateFilteredPosts.length} (시작 날짜: ${startDate || '없음'})`);
      
      // 포스트 수 정보 전송
      await safeWrite(createSSEMessage('count', { 
        total: dateFilteredPosts.length,
        message: `${dateFilteredPosts.length}개의 포스트를 찾았습니다.`
      }));
      
      // 각 포스트의 내용 가져오기
      const postsToFetch = dateFilteredPosts;
      console.log(`${postsToFetch.length}개 포스트의 내용 가져오기 시작`);
      
      // 처리된 포스트 목록
      const processedPosts = [];
      
      // 각 포스트마다 500ms 간격으로 요청하여 서버 부하 방지
      for (let i = 0; i < postsToFetch.length; i++) {
        // 클라이언트 연결 종료 확인
        if (signal.aborted) {
          console.log('스크랩이 중단되었습니다.');
          break;
        }
        
        if (i > 0) await delay(500); // 첫 요청 이후 지연
        const post = postsToFetch[i];
        
        // 진행 상황 업데이트
        const progress = {
          current: i + 1,
          total: postsToFetch.length,
          percent: Math.round(((i + 1) / postsToFetch.length) * 100),
          title: post.title
        };
        
        // 진행 정보 전송 (안전하게)
        await safeWrite(createSSEMessage('progress', progress));
        
        // 중단 확인
        if (signal.aborted) break;
        
        // 포스트 내용 가져오기 (signal 전달)
        try {
          const content = await fetchPostContent(post.url, signal);
          post.content = content;
          
          // 완료된 포스트 객체 추가
          processedPosts.push(post);
          
          // 포스트 정보 전송 (안전하게)
          await safeWrite(createSSEMessage('post', post));
          
          console.log(`포스트 ${progress.current}/${progress.total} 내용 추출 완료 (${progress.percent}%)`);
        } catch (error: any) {
          if (error.name === 'AbortError' || signal.aborted) {
            console.log('포스트 처리 중 스크랩이 중단되었습니다.');
            break;
          }
          console.error(`포스트 '${post.title}' 처리 중 오류:`, error);
        }
      }
      
      // 연결이 종료되지 않았을 경우에만 완료 이벤트 전송
      if (!signal.aborted) {
        // 완료 이벤트 전송
        await safeWrite(createSSEMessage('complete', { 
          blogName,
          posts: processedPosts,
          message: '모든 포스트 처리가 완료되었습니다.'
        }));
      }
      
    } catch (error: any) {
      console.error('블로그 스크랩 에러:', error.message);
      
      // 오류 이벤트 전송 (안전하게)
      if (!signal.aborted) {
        await safeWrite(createSSEMessage('error', { 
          message: '블로그 데이터를 가져오는 중 오류가 발생했습니다.',
          error: error.message
        }));
      }
      
      // RSS가 제공되지 않는 경우
      if (error.response && error.response.status === 404) {
        console.log('RSS 피드를 찾을 수 없습니다. 대체 데이터를 사용합니다.');
        const blogName = await getBlogNameFromUrl(blogUrl, signal);
        
        // 대체 데이터 생성
        const dummyPosts = generateDummyPosts(blogUrl, 10);
        const filteredPosts = filterPostsByKeywords(dummyPosts, keywords);
        
        // 날짜 필터링 적용
        const dateFilteredPosts = filteredPosts.filter(post => isPostAfterStartDate(post.date, startDate));
        
        // 연결이 종료되지 않았을 경우에만 완료 이벤트 전송
        if (!signal.aborted) {
          // 완료 이벤트 (경고와 함께 전송)
          await safeWrite(createSSEMessage('complete', {
            blogName,
            posts: dateFilteredPosts,
            warning: '이 블로그의 RSS 피드를 찾을 수 없습니다. 테스트 데이터가 표시됩니다.'
          }));
        }
      }
    } finally {
      // 스트림 종료 (안전하게)
      try {
        await writer.close();
      } catch (error) {
        // 스트림이 이미 닫혔거나 응답이 중단된 경우 무시
        if (error instanceof TypeError && error.message.includes('WritableStream is closed')) {
          console.log('스트림이 이미 닫혔습니다.');
        } else if (error instanceof Error && error.name === 'ResponseAborted') {
          console.log('스트림 닫기 중 응답이 중단되었습니다.');
        } else {
          console.error('스트림 닫기 오류:', error);
        }
      }
    }
  })();
  
  // 스트리밍 응답 반환
  return response;
} 