import { NextResponse } from 'next/server';
import axios from 'axios';
import * as jsdom from 'jsdom';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: '포스트 URL이 필요합니다.' },
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

    console.log('요청 URL:', url);

    // 더미 URL 검사 (RSS가 없는 경우 대체 컨텐츠)
    if (url.includes('#dummy-')) {
      const dummyContent = generateDummyContent(url);
      return NextResponse.json({ content: dummyContent });
    }

    try {
      // 블로그 ID와 포스트 ID 추출
      let blogId = '';
      let logNo = '';
      
      // URL 형식 1: blog.naver.com/PostView.naver?blogId=xxx&logNo=xxx 형식
      const paramMatch = url.match(/blogId=([^&]+).*?logNo=([^&]+)/);
      if (paramMatch) {
        blogId = paramMatch[1];
        logNo = paramMatch[2];
      } else {
        // URL 형식 2: blog.naver.com/아이디/글번호 형식
        const pathMatch = url.match(/blog\.naver\.com\/([^\/]+)\/([^\/\?]+)/);
        if (pathMatch) {
          blogId = pathMatch[1];
          logNo = pathMatch[2];
        } else {
          // URL 형식 3: m.blog.naver.com/PostView.naver?blogId=xxx&logNo=xxx
          const mobileMatch = url.match(/m\.blog\.naver\.com\/.*?blogId=([^&]+).*?logNo=([^&]+)/);
          if (mobileMatch) {
            blogId = mobileMatch[1];
            logNo = mobileMatch[2];
          } else {
            // URL 형식 4: m.blog.naver.com/아이디/글번호 형식
            const mobilePathMatch = url.match(/m\.blog\.naver\.com\/([^\/]+)\/([^\/\?]+)/);
            if (mobilePathMatch) {
              blogId = mobilePathMatch[1];
              logNo = mobilePathMatch[2];
            }
          }
        }
      }
      
      if (!blogId || !logNo) {
        return NextResponse.json({
          content: `
            <div class="error-content">
              <p>올바른 블로그 포스트 URL이 아닙니다.</p>
              <p><a href="${url}" target="_blank" rel="noopener noreferrer">원본 포스트로 이동하기</a></p>
            </div>
          `
        });
      }
      
      console.log(`추출된 블로그 ID: ${blogId}, 글 번호: ${logNo}`);
      
      // 네이버 블로그의 iframe URL 직접 요청
      try {
        // 포스트 iframe의 src URL 생성
        const postIframeUrl = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&iframe=postView`;
        console.log(`iframe URL 직접 요청: ${postIframeUrl}`);
        
        const iframeResponse = await axios.get(postIframeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache', 
            'Referer': `https://blog.naver.com/${blogId}/${logNo}`,
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 10000,
          maxRedirects: 5
        });
        
        const iframeHtml = iframeResponse.data;
        console.log('iframe URL 응답 길이:', iframeHtml.length);
        
        if (iframeHtml && iframeHtml.length > 500) {
          // iframe HTML에서 본문 추출 시도
          const iframeContent = await extractIframeContent(iframeHtml);
          if (iframeContent && iframeContent.length > 100 && !iframeContent.includes('블로그 포스트 내용을 찾지 못했습니다')) {
            console.log('iframe에서 유효한 컨텐츠 추출됨');
            return NextResponse.json({
              content: iframeContent
            });
          }
        }
      } catch (iframeError: any) {
        console.error('iframe URL 직접 요청 오류:', iframeError.message);
      }
      
      // 새로운 방식으로 직접 API 호출 시도 (보안 우회)
      try {
        // 직접 PostViewNoFrame API 호출
        const directApiUrl = `https://blog.naver.com/PostViewNoFrame.naver?blogId=${blogId}&logNo=${logNo}`;
        console.log(`직접 URL 프레임 없이 시도: ${directApiUrl}`);
        
        const directResponse = await axios.get(directApiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': `https://blog.naver.com/${blogId}`,
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Upgrade-Insecure-Requests': '1',
            'DNT': '1',
            'Connection': 'keep-alive'
          },
          timeout: 20000,
          maxRedirects: 10,
          validateStatus: function (status) {
            return status >= 200 && status < 500; // 오류 응답도 처리
          }
        });
        
        console.log('직접 응답 상태:', directResponse.status);
        if (directResponse.status === 200) {
          const directHtml = directResponse.data;
          console.log('직접 응답 받음, 길이:', directHtml.length);
          
          if (directHtml && directHtml.length > 1000) {
            // 리디렉션 감지 및 처리
            if (directHtml.includes('location.replace') || directHtml.includes('location.href=')) {
              console.log('리디렉션 감지됨, 포스트뷰 대체 URL 시도');
              // 리디렉션이 감지되면 대체 URL 사용
              const altUrl = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true&directAccess=false`;
              console.log(`대체 URL 시도: ${altUrl}`);
              
              const altResponse = await axios.get(altUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
                }
              });
              
              const altHtml = altResponse.data;
              console.log('대체 URL 응답 길이:', altHtml.length);
              
              const extractedAlt = await extractContent(altHtml);
              if (extractedAlt && !extractedAlt.includes('블로그 포스트 내용을 찾지 못했습니다')) {
                return NextResponse.json({
                  content: extractedAlt
                });
              }
            }
            
            const extractedContent = await extractContent(directHtml);
            if (extractedContent && !extractedContent.includes('블로그 포스트 내용을 찾지 못했습니다')) {
              return NextResponse.json({
                content: extractedContent
              });
            }
          }
        } else {
          console.log(`직접 API 호출 실패: 상태 코드 ${directResponse.status}`);
        }
      } catch (directError: any) {
        console.error('직접 URL 오류:', directError.message);
      }
      
      // 직접 API 호출 시도 (가장 안정적인 방법)
      try {
        // 네이버 API URL (JSON 데이터 반환)
        const apiUrl = `https://blog.naver.com/api/blogs/${blogId}/posts/${logNo}`;
        console.log(`API URL 시도: ${apiUrl}`);
        
        const apiResponse = await axios.get(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': url,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Origin': 'https://blog.naver.com'
          },
          timeout: 15000,
          maxRedirects: 5
        });
        
        const jsonData = apiResponse.data;
        console.log('API 응답 데이터 유형:', typeof jsonData);
        
        if (jsonData && typeof jsonData === 'object') {
          console.log('API 응답 키:', Object.keys(jsonData));
          
          if (jsonData.result && (jsonData.result.contentHtml || jsonData.result.contents)) {
            const contentHtml = jsonData.result.contentHtml || jsonData.result.contents;
            console.log('API에서 내용 가져옴 (직접 API)');
            return NextResponse.json({
              content: processContent(contentHtml)
            });
          }
        }
      } catch (apiError: any) {
        console.error('직접 API 호출 오류:', apiError.message);
      }
      
      // PC 버전 시도 (API 실패 시)
      try {
        // 302 리디렉션 및 프레임 우회 파라미터 추가
        const pcUrl = `https://blog.naver.com/${blogId}/${logNo}?from=postView`;
        console.log(`PC URL 시도: ${pcUrl}`);
        
        const pcResponse = await axios.get(pcUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Referer': 'https://blog.naver.com/',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'upgrade-insecure-requests': '1'
          },
          maxRedirects: 10,
          timeout: 15000,
          validateStatus: function (status) {
            return status >= 200 && status < 500; // 오류 응답도 처리
          }
        });
        
        // 상태 코드 확인
        console.log('PC 응답 상태 코드:', pcResponse.status);
        if (pcResponse.status === 404) {
          console.log('404 응답 발생, 대체 URL 사용');
          // 404인 경우 다른 URL 형식 시도
          // 레거시 URL 형식으로 시도 (확장된 형식)
          const legacyUrl = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true&directAccess=false`;
          console.log(`레거시 URL 시도 1: ${legacyUrl}`);
          
          try {
            const legacyResponse = await axios.get(legacyUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Referer': `https://blog.naver.com/${blogId}`
              }
            });
            
            const legacyHtml = legacyResponse.data;
            console.log('레거시 URL 컨텐츠 길이:', legacyHtml.length);
            
            const legacyContent = await extractContent(legacyHtml);
            if (legacyContent && !legacyContent.includes('블로그 포스트 내용을 찾지 못했습니다')) {
              return NextResponse.json({
                content: legacyContent
              });
            }
          } catch (legacyError: any) {
            console.error('레거시 URL 시도 오류:', legacyError.message);
            
            // 또 다른 레거시 URL 형식 시도
            try {
              const legacyUrl2 = `https://blog.naver.com/PostView.nhn?blogId=${blogId}&logNo=${logNo}`;
              console.log(`레거시 URL 시도 2: ${legacyUrl2}`);
              
              const legacyResponse2 = await axios.get(legacyUrl2, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                  'Referer': `https://blog.naver.com/${blogId}`
                }
              });
              
              const legacyHtml2 = legacyResponse2.data;
              const legacyContent2 = await extractContent(legacyHtml2);
              if (legacyContent2 && !legacyContent2.includes('블로그 포스트 내용을 찾지 못했습니다')) {
                return NextResponse.json({
                  content: legacyContent2
                });
              }
            } catch (legacyError2: any) {
              console.error('레거시 URL 시도 2 오류:', legacyError2.message);
            }
          }
        }
        
        const pcHtml = pcResponse.data;
        console.log('PC HTML 가져옴, 길이:', pcHtml.length);
        console.log('PC HTML 샘플:', pcHtml.substring(0, 500)); // 샘플 출력
        
        // PC 버전에서 JavaScript 변수 내용 추출 시도
        const contentMatch = pcHtml.match(/var\s+postContent\s*=\s*'([\s\S]*?)';/i) || 
                             pcHtml.match(/g_PostViewBody\s*=\s*"([\s\S]*?)";/i) ||
                             pcHtml.match(/const\s+se_publishContent\s*=\s*['"]([^'"]*)['"]/i) ||
                             pcHtml.match(/\'htContentBody\'\s*:\s*\'([^\']+)\'/i);
        
        if (contentMatch && contentMatch[1]) {
          // JavaScript 이스케이프 문자 처리
          let content = contentMatch[1]
            .replace(/\\'/g, "'")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\\n/g, '\n');
          
          // HTML 엔티티 디코딩
          content = decodeHtmlEntities(content);
          
          console.log('JavaScript 변수에서 내용 추출 성공');
          return NextResponse.json({
            content: processContent(content)
          });
        }
        
        // PC 버전에서 내용 추출
        const pcContent = await extractContent(pcHtml);
        if (pcContent && !pcContent.includes('블로그 포스트 내용을 찾지 못했습니다')) {
          return NextResponse.json({
            content: pcContent
          });
        }
      } catch (pcError: any) {
        console.error('PC 버전 시도 오류:', pcError.message);
      }
      
      // 모바일 버전 URL로 시도 (다른 방법 실패 시)
      try {
        const mobileUrl = `https://m.blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
        console.log(`모바일 URL 시도: ${mobileUrl}`);
        
        const response = await axios.get(mobileUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          maxRedirects: 5,
          timeout: 10000
        });
        
        const html = response.data;
        console.log('모바일 HTML 가져옴, 길이:', html.length);
        console.log('모바일 HTML 샘플:', html.substring(0, 500)); // 샘플 출력
        
        // 모바일 버전에서 컨텐츠 추출
        let content = await extractMobileContent(html);
        
        // 모바일 버전에서 내용을 가져오지 못한 경우 다른 모바일 API 시도
        if (!content || content.includes('블로그 포스트 내용을 찾지 못했습니다')) {
          try {
            // 새로운 모바일 API URL
            const mobileApiUrl = `https://m.blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&navType=tl`;
            console.log(`새 모바일 URL 시도: ${mobileApiUrl}`);
            
            const newMobileResponse = await axios.get(mobileApiUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            const newMobileHtml = newMobileResponse.data;
            console.log('새 모바일 HTML 가져옴, 길이:', newMobileHtml.length);
            
            content = await extractMobileContent(newMobileHtml);
          } catch (newMobileError: any) {
            console.error('새 모바일 URL 오류:', newMobileError.message);
          }
        }
        
        // 내용이 있으면 반환
        if (content && !content.includes('블로그 포스트 내용을 찾지 못했습니다')) {
          return NextResponse.json({
            content: content
          });
        }
      } catch (mobileError: any) {
        console.error('모바일 버전 시도 오류:', mobileError.message);
      }

      // 최종 대안 - 스마트 에디터 기반 JSON API
      try {
        // 새로운 포스트뷰 비동기 API
        const seApiUrl = `https://blog.naver.com/PostViewAsync.naver?blogId=${blogId}&logNo=${logNo}&viewType=pc`;
        console.log(`스마트 에디터 API URL 시도: ${seApiUrl}`);
        
        const seApiResponse = await axios.get(seApiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json,text/html',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': `https://blog.naver.com/${blogId}/${logNo}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'X-Requested-With': 'XMLHttpRequest'
          },
          validateStatus: function (status) {
            return status >= 200 && status < 500;
          }
        });
        
        console.log('스마트 에디터 API 응답 상태:', seApiResponse.status);
        const seHtml = seApiResponse.data;
        
        // API 응답이 JSON 형식인지 확인
        if (typeof seHtml === 'object' && seHtml !== null) {
          console.log('JSON 응답 발견, 키:', Object.keys(seHtml));
          
          // JSON에서 HTML 콘텐츠 추출
          if (seHtml.html) {
            console.log('JSON에서 HTML 키 발견');
            return NextResponse.json({
              content: processContent(seHtml.html)
            });
          } else if (seHtml.innerHtml) {
            console.log('JSON에서 innerHtml 키 발견');
            return NextResponse.json({
              content: processContent(seHtml.innerHtml)
            });
          } else if (seHtml.result && seHtml.result.contentHtml) {
            console.log('JSON에서 result.contentHtml 키 발견');
            return NextResponse.json({
              content: processContent(seHtml.result.contentHtml)
            });
          } else if (seHtml.contents || (seHtml.result && seHtml.result.contents)) {
            // 추가 JSON 컨텐츠 추출 옵션
            const jsonContent = seHtml.contents || (seHtml.result && seHtml.result.contents);
            console.log('JSON에서 contents 키 발견');
            return NextResponse.json({
              content: processContent(jsonContent)
            });
          } else {
            // 다른 가능한 JSON 키 탐색
            for (const key of Object.keys(seHtml)) {
              if (typeof seHtml[key] === 'string' && seHtml[key].includes('<div') && seHtml[key].length > 500) {
                console.log(`JSON에서 HTML 콘텐츠 포함된 키 발견: ${key}`);
                return NextResponse.json({
                  content: processContent(seHtml[key])
                });
              } else if (typeof seHtml[key] === 'object' && seHtml[key] !== null) {
                // 중첩된 객체 검사
                for (const subKey of Object.keys(seHtml[key])) {
                  if (typeof seHtml[key][subKey] === 'string' && 
                      seHtml[key][subKey].includes('<div') && 
                      seHtml[key][subKey].length > 500) {
                    console.log(`JSON에서 HTML 콘텐츠 포함된 중첩 키 발견: ${key}.${subKey}`);
                    return NextResponse.json({
                      content: processContent(seHtml[key][subKey])
                    });
                  }
                }
              }
            }
          }
        }
        
        // 일반 HTML 응답인 경우
        if (typeof seHtml === 'string' && seHtml.length > 500) {
          console.log('스마트 에디터 API에서 HTML 가져옴');
          const content = await extractContent(seHtml);
          if (content && !content.includes('블로그 포스트 내용을 찾지 못했습니다')) {
            return NextResponse.json({
              content: content
            });
          }
        }
      } catch (seApiError: any) {
        console.error('스마트 에디터 API 호출 오류:', seApiError.message);
      }

      // 마지막 대안 - 블로그 홈 접근 시도
      try {
        const blogHomeUrl = `https://blog.naver.com/${blogId}`;
        console.log(`블로그 홈 URL 시도: ${blogHomeUrl}`);
        
        const blogHomeResponse = await axios.get(blogHomeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        const blogHomeHtml = blogHomeResponse.data;
        console.log('블로그 홈 HTML 가져옴, 길이:', blogHomeHtml.length);
        
        // 블로그 홈 HTML에서 중요 헤더/토큰 추출 시도
        const authMatchResult = blogHomeHtml.match(/BlogDataCategory\s*=\s*\{([\s\S]*?)\}/i);
        if (authMatchResult && authMatchResult[1]) {
          console.log('블로그 데이터 카테고리 정보 찾음');
        }
        
        // 이 정보로 최종 시도
        const finalUrl = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true&directAccess=false`;
        console.log(`최종 URL 시도: ${finalUrl}`);
        
        const finalResponse = await axios.get(finalUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': blogHomeUrl,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          withCredentials: true
        });
        
        const finalHtml = finalResponse.data;
        console.log('최종 URL HTML 가져옴, 길이:', finalHtml.length);
        
        const finalContent = await extractContent(finalHtml);
        if (finalContent && !finalContent.includes('블로그 포스트 내용을 찾지 못했습니다')) {
          return NextResponse.json({
            content: finalContent
          });
        }
      } catch (finalError: any) {
        console.error('최종 URL 시도 오류:', finalError.message);
      }

      // 최종 대안으로 외부 프록시를 통해 접근 시도
      try {
        // 프록시 URL을 통한 접근 (CORS 우회)
        const proxyUrl = `https://cors-anywhere.herokuapp.com/https://blog.naver.com/${blogId}/${logNo}`;
        console.log(`프록시 URL 시도: ${proxyUrl}`);
        
        const proxyResponse = await axios.get(proxyUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://example.com'
          },
          timeout: 15000
        });
        
        const proxyHtml = proxyResponse.data;
        
        if (proxyHtml && proxyHtml.length > 1000) {
          const proxyContent = await extractContent(proxyHtml);
          return NextResponse.json({
            content: proxyContent
          });
        }
      } catch (proxyError: any) {
        console.error('프록시 접근 오류:', proxyError.message);
      }

      // 최종 대체 응답
      return NextResponse.json({
        content: `
          <div class="error-content">
            <p>블로그 포스트 내용을 가져오지 못했습니다.</p>
            <p>이유: 네이버 블로그 접근 제한 또는 차단됨</p>
            <p>해결 방법: 네이버 블로그의 보안 설정으로 인해 외부에서 콘텐츠 접근이 제한될 수 있습니다.</p>
            <p><a href="${url}" target="_blank" rel="noopener noreferrer">원본 포스트로 직접 이동하기</a></p>
          </div>
        `,
        error: '블로그 컨텐츠 접근이 제한되었습니다. 원본 링크를 확인해주세요.'
      });
    } catch (error: any) {
      console.error('포스트 내용 가져오기 에러:', error.message);
      
      // 대체 컨텐츠 제공
      const dummyContent = `
        <div class="error-content">
          <p>포스트 내용을 가져오는 데 문제가 발생했습니다.</p>
          <p>오류 메시지: ${error.message}</p>
          <p>원본 링크로 이동하여 포스트를 확인해주세요.</p>
          <p><a href="${url}" target="_blank" rel="noopener noreferrer">원본 포스트 보기</a></p>
        </div>
      `;
      
      return NextResponse.json({
        content: dummyContent,
        error: '포스트 내용을 가져오는 중 오류가 발생했습니다.'
      });
    }
  } catch (error: any) {
    console.error('포스트 내용 가져오기 요청 에러:', error.message);
    return NextResponse.json(
      { error: '포스트 내용을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// HTML 엔티티 디코딩 함수
function decodeHtmlEntities(str: string): string {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '='
  };
  
  return str.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&#x2F;|&#x60;|&#x3D;/g, match => entities[match as keyof typeof entities]);
}

// 모바일 HTML에서 내용 추출
async function extractMobileContent(html: string): Promise<string> {
  console.log('모바일 HTML에서 내용 추출 시도');
  
  // JavaScript 변수에서 컨텐츠 추출 시도
  const contentVarMatch = html.match(/var\s+htmlContent\s*=\s*["']([\s\S]*?)["'];/i);
  if (contentVarMatch && contentVarMatch[1]) {
    console.log('JavaScript 변수에서 내용 발견');
    let content = contentVarMatch[1]
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n');
    
    // HTML 엔티티 디코딩
    content = decodeHtmlEntities(content);
    
    return processContent(content);
  }
  
  // 여러 패턴을 순차적으로 시도 (모바일 버전용)
  const mobilePatterns = [
    // 패턴 1: 모바일 스마트 에디터
    /<div[^>]*class="[^"]*se_component_wrap[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i,
    
    // 패턴 2: 모바일 뷰어
    /<div[^>]*class="[^"]*viewer_mainMobile[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i,
    
    // 패턴 3: 모바일 컨텐츠
    /<div[^>]*id="viewTypeSelector"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
    
    // 패턴 4: 포스트 컨텐츠 영역
    /<div[^>]*class="[^"]*post_ct[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
    
    // 패턴 5: 모바일 블로그 내용
    /<div[^>]*class="[^"]*post_content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div class="[^"]*post_btn/i,
    
    // 패턴 6: 모바일 메인 영역
    /<div[^>]*class="[^"]*post_body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div class="[^"]*post_btn/i,
    
    // 패턴 7: 기본 컨텐츠 영역
    /<article[^>]*>([\s\S]*?)<\/article>/i
  ];
  
  // 각 패턴 시도
  for (const pattern of mobilePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      console.log('모바일 패턴 일치 발견');
      return processContent(match[1].trim());
    }
  }
  
  // 일반적인 패턴도 시도
  return await extractContent(html);
}

// 포스트 내용 추출 (기존 방식)
async function extractContent(html: string): Promise<string> {
  console.log('내용 추출 시도');
  
  // 디버깅: 추출된 HTML 길이 확인
  console.log(`HTML 길이: ${html.length}`);
  
  // 디버깅용: HTML의 일부분 출력
  console.log('HTML 일부분:', html.slice(0, 100) + '...');
  
  // iframe 태그에서 src 추출하여 직접 요청
  const iframeMatch = html.match(/<iframe[^>]*src="([^"]*)"[^>]*>/i);
  if (iframeMatch && iframeMatch[1]) {
    const iframeSrc = iframeMatch[1];
    console.log('iframe src 발견:', iframeSrc);
    
    // 상대 경로를 절대 경로로 변환
    let fullIframeSrc = iframeSrc;
    if (iframeSrc.startsWith('/')) {
      fullIframeSrc = `https://blog.naver.com${iframeSrc}`;
    }
    
    // iframe 내용을 가져오는 시도
    try {
      console.log('iframe 컨텐츠 가져오기 시도:', fullIframeSrc);
      
      const iframeResponse = await axios.get(fullIframeSrc, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://blog.naver.com/'
        },
        timeout: 10000,
        maxRedirects: 5
      });
      
      const iframeHtml = iframeResponse.data;
      console.log('iframe 컨텐츠 길이:', iframeHtml.length);
      
      if (iframeHtml && iframeHtml.length > 500) {
        // iframe HTML에서 컨텐츠 추출 시도
        const iframeContent = await extractIframeContent(iframeHtml);
        if (iframeContent && iframeContent.length > 100 && !iframeContent.includes('블로그 포스트 내용을 찾지 못했습니다')) {
          console.log('iframe에서 유효한 컨텐츠 추출됨');
          return processContent(iframeContent);
        }
      }
    } catch (iframeError: any) {
      console.error('iframe 컨텐츠 가져오기 오류:', iframeError.message);
    }
  }
  
  // JavaScript 변수에서 컨텐츠 추출 시도
  const scriptContentMatch = html.match(/var\s+postContent\s*=\s*["']([\s\S]*?)["'];/i) || 
                           html.match(/var\s+bloggermain\s*=\s*["']([\s\S]*?)["'];/i) ||
                           html.match(/var\s+htmlContent\s*=\s*["']([\s\S]*?)["'];/i);
  
  if (scriptContentMatch && scriptContentMatch[1]) {
    console.log('JavaScript 변수에서 내용 발견');
    let content = scriptContentMatch[1]
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n');
    
    // HTML 엔티티 디코딩
    content = decodeHtmlEntities(content);
    
    return processContent(content);
  }
  
  // 여러 패턴을 순차적으로 시도
  const patterns = [
    // 패턴 1: Smart Editor 2 (최신 네이버 블로그)
    /<div class="se-main-container">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/i,
    
    // 패턴 2: 포스트 뷰 영역
    /<div class="post-view">([\s\S]*?)<\/div>\s*<div class="post_footer/i,
    
    // 패턴 3: 포스트 컨텐츠 영역
    /<div[^>]*id="postViewArea"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<div/i,
    
    // 패턴 4: 다른 postViewArea 패턴
    /<div[^>]*id="postViewArea"[^>]*>([\s\S]*?)<\/div>/i,
    
    // 패턴 5: 또 다른 content 패턴
    /<div class="entry-content">([\s\S]*?)<\/div>\s*<\/div>/i,
    
    // 패턴 6: SE 편집기
    /<div class="se_component_wrap">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i,
    
    // 패턴 7: 블로그 포스트 뷰어
    /<div[^>]*class="[^"]*se_view[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
    
    // 패턴 8: 메인 컨텐츠 영역
    /<div[^>]*class="[^"]*se_doc_header[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*se_component_wrap/i,
    
    // 패턴 9: HTML 본문 영역
    /<div class="se_component_htmlCode">([\s\S]*?)<\/div>/i,
    
    // 패턴 10: 새로운 네이버 블로그 포맷
    /<div class="__se_module_data"[^>]*>([\s\S]*?)<\/div>/i,
    
    // 패턴 11: 스마트 에디터 3
    /<div class="se3-txtrow">([\s\S]*?)<\/div>/i,
    
    // 패턴 12: 최종 대안
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<div class="[^"]*footer[^"]*">/i
  ];
  
  // 각 패턴 시도하며 성공 시 로그 출력
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = html.match(pattern);
    if (match && match[1]) {
      console.log(`패턴 ${i+1} 일치 발견`);
      return processContent(match[1].trim());
    }
  }
  
  // 새로운 접근 방식: 주요 컨텐츠 섹션 태그 직접 찾기
  console.log('기본 패턴으로 찾지 못함, 직접 태그 검색');
  
  // 네이버 블로그 주요 컨텐츠 클래스 검색
  const contentClasses = [
    'se-main-container',
    'se_component_wrap',
    'post_ct',
    'post-content',
    'post_body',
    'se-module-text',
    'se_viewArea',
    'view'
  ];
  
  for (const className of contentClasses) {
    const classPattern = new RegExp(`<div[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\\s\\\S]*?)<\\/div>(?:\\s*<\\/div>){0,3}`, 'i');
    const match = html.match(classPattern);
    
    if (match && match[1] && match[1].length > 100) {
      console.log(`컨텐츠 클래스 ${className} 발견`);
      return processContent(match[1].trim());
    }
  }
  
  // 아무 패턴도 일치하지 않는 경우 - 전체 HTML에서 컨텐츠로 보이는 부분 추출 시도
  console.log('일반 패턴으로 찾지 못함, 포스트 본문 영역 검색');
  
  // 블로그 포스트 본문 영역 추출 시도
  const bodyContentMatch = html.match(/<div[^>]*class="[^"]*post_body[^"]*"[^>]*>([\s\S]*?)<\/div>(?:\s*<\/div>){1,3}/i) ||
                          html.match(/<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>(?:\s*<\/div>){1,3}/i) ||
                          html.match(/<div[^>]*class="[^"]*postContent[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                          html.match(/<div[^>]*class="[^"]*post_ct[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
                          
  if (bodyContentMatch && bodyContentMatch[1]) {
    console.log('본문 영역 발견');
    return processContent(bodyContentMatch[1].trim());
  }
  
  // 직접 본문 영역 태그 아이디로 검색
  const contentIds = [
    'postViewArea',
    'post-view',
    'viewTypeSelector',
    'postContent',
    'post_1',
    'postListBody'
  ];
  
  for (const id of contentIds) {
    const idPattern = new RegExp(`<div[^>]*id="${id}"[^>]*>([\\\s\\\S]*?)<\\/div>`, 'i');
    const match = html.match(idPattern);
    
    if (match && match[1] && match[1].length > 100) {
      console.log(`컨텐츠 ID ${id} 발견`);
      return processContent(match[1].trim());
    }
  }
  
  // 내용을 찾지 못한 경우 - body 태그 내용 추출 시도
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    console.log('body 태그에서 컨텐츠 추출 시도');
    
    // body에서 헤더, 네비게이션, 푸터 등 제외
    let bodyContent = bodyMatch[1];
    bodyContent = bodyContent.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    bodyContent = bodyContent.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    bodyContent = bodyContent.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
    bodyContent = bodyContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // 가장 긴 div 컨텐츠를 본문으로 간주
    const divMatches = bodyContent.match(/<div[^>]*>([\s\S]*?)<\/div>/gi) || [];
    let longestDiv = '';
    
    for (const div of divMatches) {
      if (div.length > longestDiv.length) {
        longestDiv = div;
      }
    }
    
    if (longestDiv.length > 100) { // 최소 길이 검사
      console.log('가장 긴 div에서 내용 추출');
      return processContent(longestDiv);
    }
    
    console.log('body 태그에서 직접 내용 추출');
    return processContent(bodyContent);
  }
  
  // 내용을 찾지 못한 경우
  console.log('내용을 찾지 못함');
  return `
    <div class="error-content">
      <p>블로그 포스트 내용을 찾지 못했습니다.</p>
      <p>원본 포스트로 이동하여 확인해주세요.</p>
    </div>
  `;
}

// iframe에서 컨텐츠 추출
async function extractIframeContent(html: string): Promise<string> {
  console.log('iframe 컨텐츠 추출 시도');
  
  // DOM 파싱 기반 스마트에디터 본문 추출 함수
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
      const paragraphs = Array.from(container.querySelectorAll<HTMLElement>('.se-text-paragraph'));
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
      const quoteModules = Array.from(container.querySelectorAll<HTMLElement>('.se-module-quotation'));
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
      const codeModules = Array.from(container.querySelectorAll<HTMLElement>('.se-module-code'));
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
      const tableModules = Array.from(container.querySelectorAll<HTMLElement>('.se-module-table'));
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
        
        const textModules = Array.from(container.querySelectorAll<HTMLElement>('.se-module-text'));
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
        
        const allModules = Array.from(container.querySelectorAll<HTMLElement>('.se-module:not(.se-module-image)'));
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
  
  // 스마트에디터 본문 추출 함수 추가
  const extractSmartEditorContent = (htmlContent: string): string => {
    console.log('스마트에디터 내부 컨텐츠 구조적 추출 시도');
    
    // JSDOM 기반 DOM 파싱으로 추출 시도
    const domContent = extractSmartEditorContentDOM(htmlContent);
    if (domContent && domContent.length > 100) {
      console.log('DOM 기반 추출 성공');
      return domContent;
    }
    
    // DOM 파싱 실패 시 정규식 기반 대체 추출 시도
    console.log('DOM 기반 추출 실패, 정규식 기반 추출 시도');
    return extractSmartEditorContentRegex(htmlContent);
  };
  
  // 서버 환경에서는 DOMParser를 직접 사용할 수 없기 때문에 정규식 기반 처리로 변환
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
    
    // 이미지 모듈은 텍스트 본문만 추출하므로 제외
    
    // 3. 인용구 모듈 추출
    const quotePattern = /<div[^>]*class="[^"]*se-module-quotation[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let quoteMatch;
    
    while ((quoteMatch = quotePattern.exec(mainContainer)) !== null) {
      const quoteHtml = quoteMatch[1];
      const quoteText = quoteHtml.replace(/<[^>]*>/g, '').trim();
      if (quoteText) {
        content += `\n\n${quoteText}\n\n`;
      }
    }
    
    // 4. 코드 모듈 추출
    const codePattern = /<div[^>]*class="[^"]*se-module-code[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let codeMatch;
    
    while ((codeMatch = codePattern.exec(mainContainer)) !== null) {
      const codeHtml = codeMatch[1];
      const codeText = codeHtml.replace(/<[^>]*>/g, '').trim();
      if (codeText) {
        content += `\n\n${codeText}\n\n`;
      }
    }
    
    // 5. 표 모듈 추출 - 텍스트만 추출
    const tablePattern = /<div[^>]*class="[^"]*se-module-table[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let tableMatch;
    
    while ((tableMatch = tablePattern.exec(mainContainer)) !== null) {
      const tableHtml = tableMatch[1];
      const tableText = tableHtml.replace(/<[^>]*>/g, '').trim();
      if (tableText) {
        content += `\n\n${tableText}\n\n`;
      }
    }
    
    // 컨텐츠가 충분히 없으면 모든 텍스트 추출 시도 (이미지 제외)
    if (content.length < 100) {
      console.log('정규식으로 충분한 컨텐츠 추출 실패, 모든 모듈 처리 시도');
      
      // 모든 모듈 패턴 추출 (이미지 모듈 제외 처리)
      const modulePattern = /<div[^>]*class="[^"]*se-module(?!-image)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
      let moduleMatch;
      
      while ((moduleMatch = modulePattern.exec(mainContainer)) !== null) {
        const moduleHtml = moduleMatch[1];
        const moduleText = moduleHtml.replace(/<[^>]*>/g, '').trim();
        if (moduleText && moduleText.length > 10) {
          content += `\n\n${moduleText}\n\n`;
        }
      }
    }
    
    // 여전히 컨텐츠가 부족하면 컨테이너 내 모든 텍스트 추출
    if (content.length < 100) {
      const strippedText = mainContainer.replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (strippedText.length > content.length) {
        console.log('컨테이너 전체 텍스트 추출 시도');
        content = strippedText;
      }
    }
    
    console.log(`스마트에디터 컨텐츠 정규식 추출 완료, 길이: ${content.length}`);
    return content;
  };
  
  // 여러 선택자를 통한 본문 추출 패턴 (우선순위 순)
  const contentSelectors = [
    // 최신 스마트에디터 글
    { regex: /<div[^>]*class="[^"]*se-main-container[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, name: 'se-main-container' },
    
    // 구형 포스트 영역 (PostViewArea)
    { regex: /<div[^>]*id="postViewArea"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, name: 'postViewArea' },
    
    // post_ct 영역 (Mobile + PC 겸용)
    { regex: /<div[^>]*class="[^"]*post_ct[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, name: 'post_ct' },
    
    // contentArea 영역
    { regex: /<div[^>]*id="contentArea"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, name: 'contentArea' },
    
    // view 클래스 영역
    { regex: /<div[^>]*class="[^"]*view[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, name: 'view' },
    
    // SE3 컴포넌트 영역 (스마트에디터 3)
    { regex: /<div[^>]*class="[^"]*se_component_wrap[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i, name: 'se_component_wrap' },
    
    // SE2 컴포넌트 영역 (스마트에디터 2)
    { regex: /<div[^>]*class="[^"]*se-component[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, name: 'se-component' },
    
    // 일반 컨텐츠 영역
    { regex: /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, name: 'content' },
    
    // 포스트 내용
    { regex: /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, name: 'post-content' },
    
    // post_body 영역
    { regex: /<div[^>]*class="[^"]*post_body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, name: 'post_body' },
    
    // 뷰어 영역
    { regex: /<div[^>]*class="[^"]*viewer[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, name: 'viewer' },
    
    // 뷰 타입 선택자
    { regex: /<div[^>]*id="viewTypeSelector"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, name: 'viewTypeSelector' },
    
    // 글 본문 영역
    { regex: /<div[^>]*class="[^"]*article_body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, name: 'article_body' },
    
    // 제목+본문 영역
    { regex: /<div[^>]*class="[^"]*se_doc_header[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*se_component_wrap/i, name: 'se_doc_header' },
    
    // mainFrame 하위 내용
    { regex: /<div[^>]*id="mainFrame"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, name: 'mainFrame' }
  ];
  
  // 스마트에디터 3 구조 확인 (se-main-container가 있는지 먼저 검사)
  if (html.includes('se-main-container')) {
    console.log('스마트에디터 구조 발견, DOM 기반 파싱 시도');
    const smartEditorContent = extractSmartEditorContentDOM(html);
    if (smartEditorContent && smartEditorContent.length > 100) {
      console.log('DOM 기반 파싱으로 본문 추출 성공');
      return processContent(smartEditorContent);
    }
  }
  
  // 각 셀렉터 패턴을 순차적으로 시도
  for (const selector of contentSelectors) {
    const match = html.match(selector.regex);
    if (match && match[1] && match[1].length > 200) {
      console.log(`${selector.name} 영역에서 컨텐츠 발견`);
      
      // 스마트에디터 컨텐츠는 특별 처리
      if (selector.name === 'se-main-container') {
        console.log('스마트에디터 컨텐츠 발견, 구조적 추출 시도');
        const smartEditorContent = extractSmartEditorContent(html);
        if (smartEditorContent && smartEditorContent.length > 100) {
          return processContent(smartEditorContent);
        }
      }
      
      return processContent(match[1]);
    }
  }
  
  // JavaScript 변수에서 컨텐츠 추출
  const jsVariables = [
    { regex: /var\s+postContent\s*=\s*["']([\s\S]*?)[""];/i, name: 'postContent' },
    { regex: /var\s+htmlContent\s*=\s*["']([\s\S]*?)[""];/i, name: 'htmlContent' },
    { regex: /var\s+bloggermain\s*=\s*["']([\s\S]*?)[""];/i, name: 'bloggermain' },
    { regex: /g_PostViewBody\s*=\s*["']([\s\S]*?)[""];/i, name: 'g_PostViewBody' },
    { regex: /const\s+se_publishContent\s*=\s*['"]([^'"]*)['"];/i, name: 'se_publishContent' },
    { regex: /\'htContentBody\'\s*:\s*\'([^\']+)\'/i, name: 'htContentBody' }
  ];
  
  for (const jsVar of jsVariables) {
    const match = html.match(jsVar.regex);
    if (match && match[1]) {
      console.log(`JavaScript 변수 ${jsVar.name}에서 컨텐츠 발견`);
      let content = match[1]
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n');
      
      // HTML 엔티티 디코딩
      content = decodeHtmlEntities(content);
      
      // 자바스크립트 변수에서 추출한 HTML에서 스마트에디터 컨텐츠 찾기
      if (content.includes('se-main-container')) {
        console.log('자바스크립트 변수에서 스마트에디터 컨텐츠 발견');
        const smartEditorContent = extractSmartEditorContent(content);
        if (smartEditorContent && smartEditorContent.length > 100) {
          return processContent(smartEditorContent);
        }
      }
      
      return processContent(content);
    }
  }
  
  // 내용 찾지 못한 경우, 대안으로 본문 영역을 더 넓게 탐색
  const fallbackSelectors = [
    // article 태그 내부
    { regex: /<article[^>]*>([\s\S]*?)<\/article>/i, name: 'article' },
    
    // main 태그 내부
    { regex: /<main[^>]*>([\s\S]*?)<\/main>/i, name: 'main' },
    
    // body 태그 내부 (헤더, 푸터 제외)
    { regex: /<body[^>]*>([\s\S]*?)<\/body>/i, name: 'body' }
  ];
  
  for (const fallback of fallbackSelectors) {
    const match = html.match(fallback.regex);
    if (match && match[1] && match[1].length > 500) {  // 더 긴 내용이어야 함
      console.log(`대안 ${fallback.name} 영역에서 컨텐츠 발견`);
      
      // 불필요한 요소 제거
      let content = match[1];
      content = content.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
      content = content.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
      content = content.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
      content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      
      // body 안에서도 스마트에디터 컨텐츠 확인
      if (content.includes('se-main-container')) {
        console.log('대안 영역에서 스마트에디터 컨텐츠 발견');
        const smartEditorContent = extractSmartEditorContent(content);
        if (smartEditorContent && smartEditorContent.length > 100) {
          return processContent(smartEditorContent);
        }
      }
      
      return processContent(content);
    }
  }
  
  // 일반적인 본문 추출 방식 시도
  return await extractContent(html);
}

// 내용 처리 (이미지 URL 정규화 등)
function processContent(content: string): string {
  console.log('내용 처리 중');
  console.log('처리 전 컨텐츠 길이:', content.length);
  
  // 컨텐츠가 너무 짧은지 확인
  if (content.trim().length < 50) {
    console.log('컨텐츠가 너무 짧음:', content);
  }
  
  // 프레임셋 관련 코드 제거
  content = removeFramesetCode(content);
  
  // 이미지 태그 제거
  let processed = content.replace(/<img[^>]*>/gi, '');
  
  // iframe 제거 (비디오나 임베디드 콘텐츠)
  processed = processed.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  
  // 그림 관련 div 제거
  processed = processed.replace(/<div[^>]*class="[^"]*se-module-image[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, '');
  processed = processed.replace(/<div[^>]*class="[^"]*se-image[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, '');
  processed = processed.replace(/<div[^>]*class="[^"]*embedded-image[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  
  // 불필요한 스크립트 제거
  processed = processed.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
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

// 테스트용 더미 내용 생성 (RSS가 없는 경우 대체용)
function generateDummyContent(url: string) {
  const postNumber = url.split('#dummy-').pop() || '0';
  const index = parseInt(postNumber, 10) || 0;
  
  return `
    <div class="dummy-content">
      <h2>RSS를 찾을 수 없는 블로그 포스트 #${index}</h2>
      <p>이 블로그는 RSS 피드를 제공하지 않습니다.</p>
      <p>실제 블로그를 방문하여 내용을 확인해 주세요.</p>
      <hr />
      <p><strong>대체 컨텐츠:</strong> RSS 피드가 없는 블로그의 경우 포스트 내용을 가져올 수 없습니다.</p>
      <p>네이버 블로그 설정에서 RSS 피드 제공을 활성화하면 스크랩 기능을 사용할 수 있습니다.</p>
    </div>
  `;
}

// 네이버에 프레임셋 제어 관련 코드 처리
function removeFramesetCode(content: string): string {
  // 프레임셋 관련 유해 스크립트 제거
  let processed = content;
  
  // oFramesetTitleController 관련 스크립트 제거
  processed = processed.replace(/<script[^>]*>[\s\S]*?oFramesetTitleController[\s\S]*?<\/script>/gi, '');
  processed = processed.replace(/oFramesetTitleController/g, '');
  
  // titleParamReferrer 관련 스크립트 제거
  processed = processed.replace(/<script[^>]*>[\s\S]*?titleParamReferrer[\s\S]*?<\/script>/gi, '');
  
  // 모든 스크립트 시작 태그가 끝 태그 없이 종료되는 경우 수정
  processed = processed.replace(/<script([^>]*)>([^<]*)<([^\/])/gi, '<script$1>$2</$3');
  
  // iframe 태그 수정하여 안전하게 로드
  processed = processed.replace(/<iframe([^>]*)>/gi, '<iframe$1 sandbox="allow-same-origin allow-scripts" loading="lazy">');
  
  // HTML 문법 오류 수정
  processed = processed.replace(/<(\/)?([^> ]+)([^>]*?)\/>/g, '<$1$2$3>');
  
  return processed;
} 