import { NextResponse } from 'next/server';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { extractSmartEditorContentDOM, extractSmartEditorContentRegex } from '../content/route';

// 포스트 본문 가져오는 함수
async function fetchPostContent(link: string): Promise<string> {
  try {
    console.log(`포스트 본문 크롤링 시작: ${link}`);
    const response = await axios.get(link);
    const htmlContent = response.data;

    // DOM 파싱 방식으로 시도
    let content = extractSmartEditorContentDOM(htmlContent);
    
    // DOM 파싱 실패 시 정규식 방식으로 시도
    if (!content || content.length < 100) {
      console.log('DOM 파싱 실패, 정규식 방식 시도');
      content = extractSmartEditorContentRegex(htmlContent);
    }

    if (!content || content.length < 100) {
      console.log('본문 추출 실패');
      return '본문을 가져오지 못했습니다.';
    }

    return content;
  } catch (error) {
    console.error('포스트 본문 크롤링 실패:', error);
    return '본문을 가져오는 중 오류가 발생했습니다.';
  }
}

// 지연 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const blogId = searchParams.get('blogId');

    if (!blogId) {
      return NextResponse.json({ error: 'Blog ID is required' }, { status: 400 });
    }

    const rssUrl = `https://rss.blog.naver.com/${blogId}`;
    const response = await axios.get(rssUrl);
    const result = await parseStringPromise(response.data);

    if (!result.rss || !result.rss.channel || !result.rss.channel[0].item) {
      return NextResponse.json({ error: 'Invalid RSS format' }, { status: 400 });
    }

    const items = result.rss.channel[0].item;
    const posts = items.map((item: any) => ({
      title: item.title[0],
      link: item.link[0],
      date: item.pubDate[0],
      content: '' // 초기값은 빈 문자열
    }));

    // 각 포스트의 본문 내용을 크롤링
    console.log(`총 ${posts.length}개의 포스트 본문 크롤링 시작`);
    
    // Promise.allSettled로 모든 요청을 병렬 처리하되, 각 요청 사이에 딜레이를 줌
    const contentPromises = posts.map(async (post, index) => {
      await delay(index * 500); // 각 요청 사이에 500ms 딜레이
      return fetchPostContent(post.link);
    });

    const results = await Promise.allSettled(contentPromises);
    
    // 결과를 posts 배열에 반영
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        posts[index].content = result.value;
      } else {
        console.error(`포스트 ${index + 1} 크롤링 실패:`, result.reason);
        posts[index].content = '본문을 가져오지 못했습니다.';
      }
    });

    console.log('모든 포스트 크롤링 완료');
    return NextResponse.json({ posts });

  } catch (error) {
    console.error('RSS 처리 중 오류:', error);
    return NextResponse.json({ error: 'Failed to fetch RSS feed' }, { status: 500 });
  }
} 