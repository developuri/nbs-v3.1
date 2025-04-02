import React, { useState } from 'react';

interface Props {
  onSuccess?: () => void;
}

export default function GoogleCredentialsUploader({ onSuccess }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 확장자 검사
    if (!file.name.endsWith('.json')) {
      setMessage({
        text: '.json 파일만 업로드할 수 있습니다.',
        type: 'error'
      });
      return;
    }

    try {
      setIsUploading(true);
      setMessage(null);

      // 파일 내용 읽기
      const fileContent = await file.text();
      
      // JSON 형식 검증
      try {
        JSON.parse(fileContent);
      } catch (error) {
        setMessage({
          text: '유효하지 않은 JSON 파일입니다.',
          type: 'error'
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/google/credentials', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '업로드 중 오류가 발생했습니다.');
      }

      setMessage({
        text: data.message || '인증 파일이 성공적으로 저장되었습니다.',
        type: 'success'
      });

      // 성공 콜백 호출
      onSuccess?.();

      // 파일 입력 초기화
      event.target.value = '';
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="credentials" className="block text-sm font-medium text-gray-700 mb-2">
          구글 서비스 계정 인증 파일 (.json)
        </label>
        <input
          type="file"
          id="credentials"
          accept=".json"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500">
          구글 서비스 계정의 키 파일을 업로드하세요. 이 파일은 서버에 안전하게 저장됩니다.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700' 
            : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {isUploading && (
        <div className="text-sm text-gray-500">
          업로드 중...
        </div>
      )}
    </div>
  );
} 