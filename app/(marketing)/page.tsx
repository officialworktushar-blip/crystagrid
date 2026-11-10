import type { Metadata } from "next";
import Hero from "@/components/marketing/Hero";
import StatsRow from "@/components/marketing/StatsRow";
import Capabilities from "@/components/marketing/sections/Capabilities";
import Faq from "@/components/marketing/sections/Faq";
import Features from "@/components/marketing/sections/Features";
import FinalCta from "@/components/marketing/sections/FinalCta";
import HowItWorks from "@/components/marketing/sections/HowItWorks";
import Pricing from "@/components/marketing/sections/Pricing";
import Venues from "@/components/marketing/sections/Venues";
import WhyCrystagrid from "@/components/marketing/sections/WhyCrystagrid";

export const metadata: Metadata = {
  title: "Crystagrid — Control every screen from one dashboard",
  description:
    "Crystagrid is the digital signage cloud for uploading media, building playlists, and pushing content to every screen in real time.",
};

export default function MarketingPage() {
  return (
    <>
      <Hero />
      <StatsRow />
      <HowItWorks />
      <Features />
      <Capabilities />
      <Venues />
      <WhyCrystagrid />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}
