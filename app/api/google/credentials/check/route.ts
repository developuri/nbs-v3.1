import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    
    try {
      const envContent = await fs.readFile(envPath, 'utf-8');
      const hasCredentials = envContent.includes('GOOGLE_CREDENTIALS=');
      
      return NextResponse.json({ hasCredentials });
    } catch (error) {
      // .env.local 파일이 없는 경우
      return NextResponse.json({ hasCredentials: false });
    }
  } catch (error) {
    console.error('인증 파일 상태 확인 오류:', error);
    return NextResponse.json({ hasCredentials: false });
  }
} 