import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "SmartDocIQ - AI Document Intelligence Platform",
  description: "Extract, analyze, and chat with your documents using advanced AI",
  keywords: ["AI", "Document Intelligence", "OCR", "NLP", "RAG", "Document Analysis"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
