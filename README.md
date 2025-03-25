# 네이버 블로그 스크래퍼

이 프로젝트는 네이버 블로그의 포스트 내용을 스크랩하는 Next.js 기반의 웹 애플리케이션입니다.

## 주요 기능

- 네이버 블로그 포스트 URL을 입력하면 본문 내용을 추출
- 스마트 에디터 3.0 기반의 블로그 포스트 지원
- 텍스트 컨텐츠 중심의 추출 (이미지 제외)
- 다양한 블로그 레이아웃 및 형식 지원

## 기술 스택

- Next.js 13+
- TypeScript
- JSDOM
- Axios

## 설치 방법

1. 저장소 클론
```bash
git clone [repository-url]
cd [repository-name]
```

2. 의존성 설치
```bash
npm install
```

3. 개발 서버 실행
```bash
npm run dev
```

## 사용 방법

1. 개발 서버를 실행합니다
2. 웹 브라우저에서 `http://localhost:3000`에 접속합니다
3. 네이버 블로그 포스트 URL을 입력하고 스크랩 버튼을 클릭합니다

## 라이선스

MIT License 