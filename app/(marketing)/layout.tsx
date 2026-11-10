import AnnouncementBar from "@/components/marketing/AnnouncementBar";
import Footer from "@/components/marketing/Footer";
import Navbar from "@/components/marketing/Navbar";
import TopStrip from "@/components/marketing/TopStrip";
import type { ReactNode } from "react";

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-white">
      <header className="absolute inset-x-0 top-0 z-50">
        <AnnouncementBar />
        <TopStrip />
        <Navbar />
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
