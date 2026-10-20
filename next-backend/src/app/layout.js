import "./globals.css";

export const metadata = {
  title: "Online Course Service",
  description: "Online course management and enrollment",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
