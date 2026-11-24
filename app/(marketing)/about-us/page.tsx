import type { Metadata } from "next";
import AboutHero from "@/components/marketing/about/AboutHero";
import AboutNetwork from "@/components/marketing/about/AboutNetwork";
import AboutQuote from "@/components/marketing/about/AboutQuote";
import AboutStory from "@/components/marketing/about/AboutStory";
import AboutVision from "@/components/marketing/about/AboutVision";
import AboutWhy from "@/components/marketing/about/AboutWhy";

export const metadata: Metadata = {
  title: "About Us | Crystagrid",
  description:
    "Crystagrid turns everyday places in Dehradun into digital screens where local brands connect with people.",
};

export default function AboutUsPage() {
  return (
    <div className="dark-grid-section min-h-screen overflow-x-hidden">
      <AboutHero />
      <AboutStory />
      <AboutVision />
      <AboutWhy />
      <AboutNetwork />
      <AboutQuote />
    </div>
  );
}
