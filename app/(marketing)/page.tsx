import type { Metadata } from "next";
import Hero from "@/components/marketing/Hero";
import StatsRow from "@/components/marketing/StatsRow";
import Capabilities from "@/components/marketing/sections/Capabilities";
import Features from "@/components/marketing/sections/Features";
import HowItWorks from "@/components/marketing/sections/HowItWorks";
import Venues from "@/components/marketing/sections/Venues";

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
    </>
  );
}
