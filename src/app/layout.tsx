import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goal Observation Tracker",
  description: "Traceable classroom evidence, from observation to review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
