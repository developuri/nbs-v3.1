import GoogleCredentialsUploader from '@/app/components/GoogleCredentialsUploader';

export default function GoogleSheetPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">구글 시트 저장 설정</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">구글 서비스 계정 인증</h2>
        <p className="text-gray-600 mb-4">
          구글 시트에 데이터를 저장하기 위해서는 서비스 계정 인증이 필요합니다.
          서비스 계정의 인증 파일(.json)을 업로드해주세요.
        </p>
        <GoogleCredentialsUploader />
      </div>
    </div>
  );
} 