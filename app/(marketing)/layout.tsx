import Footer from "@/components/marketing/Footer";
import Navbar from "@/components/marketing/Navbar";
import type { ReactNode } from "react";

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#05060a] text-white">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
