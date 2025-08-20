import "@/styles/globals.css";

import { Inter } from "next/font/google";
import { type Metadata } from "next";

import { TRPCReactProvider } from "@/trpc/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "CellByte - Chat with Data",
  description: "Turn natural language questions into analytics over tabular data",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} antialiased`}>
        <TRPCReactProvider>
          <div className="min-h-screen bg-background">
            {children}
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
