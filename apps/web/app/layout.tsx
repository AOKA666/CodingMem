import "./globals.css";

export const metadata = {
  title: "Codex 聊天同步",
  description: "AI 编程记忆面板"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
