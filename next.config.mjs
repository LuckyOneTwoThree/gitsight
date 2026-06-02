/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.101.76"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https://avatars.githubusercontent.com https://github.com https://raw.githubusercontent.com data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.github.com https://api.openai.com https://api.deepseek.com https://api.moonshot.ai https://token-plan-cn.xiaomimimo.com https://openrouter.ai",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

export default nextConfig
