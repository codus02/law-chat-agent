import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 개발 서버로 시연할 때 왼쪽 아래 Next.js 표시가 메뉴를 가리지 않게 한다. 오류 표시는 그대로 뜬다.
  devIndicators: false,
};

export default nextConfig;
