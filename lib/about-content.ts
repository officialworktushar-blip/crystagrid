export const ABOUT_IMAGES = [
  {
    src: "/Tatvan_Vertical.webp",
    alt: "Retail Stores",
    title: "Retail Stores",
    text: "Reach shoppers right where they decide what to buy.",
  },
  {
    src: "/Atira_Veritcal.webp",
    alt: "Offices & Lobbies",
    title: "Offices & Lobbies",
    text: "Connect with professionals during their daily routine.",
  },
  {
    src: "/Tarya_Vertical.webp",
    alt: "Gyms & Salons",
    title: "Gyms & Salons",
    text: "Engage people who care about health, style and self-care.",
  },
  {
    src: "/Cafe_Vertical.webp",
    alt: "Restaurants & Cafes",
    title: "Restaurants & Cafes",
    text: "Catch diners while they relax, wait and choose what to order.",
  },
] as const;

// Dehradun photos can be added to this list later; keep these four sources in sync with the Venues section.

export const VIDEO_SRC = "/about-video.mp4";

export const ABOUT_HERO = {
  chip: "About Crystagrid",
  headingStart: "From Dehradun Streets to ",
  headingAccent: "Digital Screens",
  paragraph:
    "We started with a simple idea: the busiest corners of Dehradun, its lifts, lobbies, offices, shops and cafes, can tell your story. Crystagrid brings screens, technology and creativity together, so local brands can reach people in the real places where they live, work and shop.",
} as const;

export const ABOUT_STORY = {
  chip: "Local Storytelling",
  heading: "Everyday places, now a stage for your brand.",
  paragraph:
    "From the lift you take home to the cafe where you stop for coffee, we place bright, full-screen ads at the moments when people are already looking around and have a few seconds to spare.",
} as const;

export const ABOUT_VISION = {
  chip: "Our Vision",
  heading: "Dehradun is full of stories waiting to be seen.",
  paragraph:
    "We look at the city differently. Not as a wall of posters, but as a living canvas. Our aim is to help local businesses, from a neighbourhood shop to a growing brand, reach the people of Dehradun on screens they notice every day.",
  tiles: [
    { word: "Local first", caption: "Built for the businesses of Dehradun" },
    { word: "10 sec", caption: "Full-screen slots that play in full" },
    { word: "Live", caption: "Content changes reach screens within seconds" },
  ],
} as const;

export const ABOUT_WHY = {
  chip: "Why We Built It",
  heading: "Traditional outdoor advertising needed a fresh approach.",
  paragraph:
    "Fixed hoardings are slow to change and costly to redo. With Crystagrid you choose the places and dates, see the full price with GST before you book, and your account manager can update your content any time.",
  cards: [
    {
      title: "Choose your places",
      text: "Pick the exact properties and areas where your customers are.",
    },
    {
      title: "Book online in minutes",
      text: "Select a package, set your dates and see a clear price.",
    },
    {
      title: "Change content anytime",
      text: "Update your message without visiting the screens.",
    },
  ],
} as const;

export const ABOUT_NETWORK = {
  chip: "Network",
  heading: "Across Dehradun: Where You'll Find Us",
  secondaryCta: "See the map",
  secondaryHref: "/#network",
  primaryCta: "Book CrystaGrid Ads →",
  primaryHref: "/book",
} as const;

export const ABOUT_QUOTE = {
  quote:
    "We are not just putting screens on walls. We are helping Dehradun's brands get noticed, remembered and talked about.",
  attribution: "The Crystagrid Team",
} as const;
