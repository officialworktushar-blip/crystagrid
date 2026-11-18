import type { Metadata } from "next";
import SignageHero from "@/components/marketing/signage/SignageHero";
import ServicesGrid from "@/components/marketing/signage/ServicesGrid";
import ScreenSelector from "@/components/marketing/signage/ScreenSelector";
import SlotLoop from "@/components/marketing/signage/SlotLoop";
import SignageVenues from "@/components/marketing/signage/SignageVenues";
import SignageFaq from "@/components/marketing/signage/SignageFaq";
import SignageCta from "@/components/marketing/signage/SignageCta";

export const metadata: Metadata = {
  title: "Digital Signage | Crystagrid",
  description:
    "Choose your screen shape and colour and run full-screen 10-second ads across Dehradun with Crystagrid.",
};

export default function DigitalSignagePage() {
  return (
    <main className="overflow-x-hidden bg-[#020617]">
      <SignageHero />
      <ServicesGrid />
      <ScreenSelector />
      <SlotLoop />
      <SignageVenues />
      <SignageFaq />
      <SignageCta />
    </main>
  );
}
