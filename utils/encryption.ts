// 환경 변수에서 암호화 키 가져오기
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key-32-chars-long!!!!!!!!!';

export async function encryptData(data: string): Promise<string> {
  try {
    // TextEncoder를 사용하여 문자열을 바이트 배열로 변환
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // 암호화 키 생성
    const keyBuffer = await crypto.subtle.importKey(
      'raw',
      encoder.encode(ENCRYPTION_KEY),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // 초기화 벡터(IV) 생성
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 데이터 암호화
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      keyBuffer,
      dataBuffer
    );
    
    // IV와 암호화된 데이터를 결합
    const result = new Uint8Array(iv.length + new Uint8Array(encryptedBuffer).length);
    result.set(iv);
    result.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Base64로 인코딩하여 반환
    return btoa(Array.from(result).map(byte => String.fromCharCode(byte)).join(''));
  } catch (error) {
    console.error('Encryption failed:', error);
    return data; // 암호화 실패 시 원본 데이터 반환
  }
}

export async function decryptData(encryptedData: string): Promise<string> {
  try {
    // Base64 디코딩
    const data = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map(char => char.charCodeAt(0))
    );
    
    // IV 추출 (처음 12바이트)
    const iv = data.slice(0, 12);
    const encryptedBuffer = data.slice(12);
    
    // 암호화 키 생성
    const keyBuffer = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(ENCRYPTION_KEY),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // 데이터 복호화
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      keyBuffer,
      encryptedBuffer
    );
    
    // 복호화된 데이터를 문자열로 변환
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedData; // 복호화 실패 시 암호화된 데이터 반환
  }
} 