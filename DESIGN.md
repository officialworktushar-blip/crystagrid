# Crystagrid Design System

Crystagrid is a dark, premium DOOH and ad-tech product. This document is the source of truth for all new marketing and product UI.

The project uses:

- Next.js App Router
- Tailwind CSS v4 via `@theme` in `app/globals.css` (there is no `tailwind.config.ts`)
- The `cn()` helper in `lib/utils.ts`

## Visual Direction

- Deep navy backgrounds with high-contrast white typography.
- A restrained sky-to-blue accent used for emphasis and primary actions.
- Large headings, generous spacing, rounded geometry, and soft blue glows.
- Calm, purposeful motion. Avoid decorative noise.
- Dark mode only.

## Color Tokens

| Role | Value | CSS variable | Tailwind utility |
| --- | --- | --- | --- |
| Page background | `#020617` | `--color-background` | `bg-background` |
| Surface | `#0a1226` | `--color-surface` | `bg-surface` |
| Surface 2 | `#0f1b3a` | `--color-surface-2` | `bg-surface-2` |
| Border | `rgba(255, 255, 255, 0.08)` | `--color-border` | `border-border` |
| Heading text | `#ffffff` | — | `text-white` |
| Body text | `rgba(255, 255, 255, 0.65)` | `--color-body` | `text-body` |
| Muted text | `rgba(255, 255, 255, 0.4)` | `--color-muted` | `text-muted` |
| Sky accent | `#0ea5e9` | `--color-brand-sky` | `text-brand-sky`, `bg-brand-sky` |
| Blue accent | `#1d6fff` | `--color-brand-blue` | `text-brand-blue`, `bg-brand-blue` |

Use `text-white` for headings, `text-body` for paragraphs, and `text-muted` for secondary labels and metadata.

For borders, prefer `border-white/10` on components and `border-border` for quieter dividers.

## Gradients

Two global utilities are defined in `app/globals.css`:

```css
brand-gradient        /* linear-gradient(90deg, #0ea5e9, #1d6fff) */
text-brand-gradient   /* same gradient clipped to text */
```

Examples:

```tsx
<Button>Start free</Button>

<h2 className="text-white">
  Built for <span className="text-brand-gradient">every screen</span>
</h2>
```

Do not create one-off cyan-to-blue gradients. Use `brand-gradient` for primary fills and `text-brand-gradient` for highlighted words.

## Typography

- Font: **Plus Jakarta Sans**, loaded with `next/font/google` in `app/layout.tsx`.
- Weights: `400`, `500`, `600`, `700`, `800`.
- CSS variable: `--font-plus-jakarta`.
- Body copy: `text-body`, comfortable line height (`leading-7` for paragraphs).
- Headings: `font-bold` or `font-extrabold`, `tracking-tight`, `leading-[1.05]`.
- Eyebrow labels: `text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky`.
- Gradient text: add `text-brand-gradient` to the highlighted span.

Recommended heading sizes:

```tsx
// H1
className="text-4xl font-extrabold tracking-tight leading-[1.05] sm:text-5xl lg:text-7xl"

// H2
className="text-3xl font-extrabold tracking-tight leading-[1.05] sm:text-4xl lg:text-5xl"
```

## Radius

- Buttons and chips: `rounded-full`
- Cards and large panels: `rounded-3xl`
- Inputs and smaller controls: `rounded-xl` or `rounded-2xl`

## Shadows And Glow

| Role | CSS variable | Tailwind utility |
| --- | --- | --- |
| Primary button glow | `--shadow-brand` | `shadow-brand` |
| Card hover glow | `--shadow-card` | `shadow-card` |

Avoid heavy neutral shadows. Glows should be blue, soft, and restrained.

## Layout

Use `Container` for page-level content:

```tsx
import Container from "@/components/ui/Container";

<Container>
  <section>...</section>
</Container>
```

Equivalent utility pattern: `mx-auto w-full max-w-7xl px-6`.

Use generous section spacing, such as `py-20 sm:py-28`, unless a layout calls for something tighter.

## Global Background

`body` is globally set to:

- Background: `#020617`
- Text: white
- Antialiased font rendering
- A faint radial blue glow at the top: `rgba(29, 111, 255, 0.15)`

`html` uses `color-scheme: dark`, and the app viewport uses `themeColor: "#020617"`.

Do not repeat the top glow on every section. Let the global background show through, and use `bg-surface` for cards and raised panels.

## Components

### Button

File: `components/ui/Button.tsx`

Variants:

- `primary`: brand gradient, white text, blue glow, optional arrow, hover lift.
- `secondary`: white/5 background, white/10 border, backdrop blur, white text.
- `ghost`: transparent with subtle white hover.

Props:

```tsx
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  withArrow?: boolean;
  asChild?: boolean;
};
```

Usage:

```tsx
import Link from "next/link";
import Button from "@/components/ui/Button";

<Button withArrow>Start free</Button>
<Button variant="secondary">Login</Button>
<Button variant="ghost" size="sm">Cancel</Button>

<Button asChild withArrow>
  <Link href="/register">Start free</Link>
</Button>
```

### Card

File: `components/ui/Card.tsx`

Uses `bg-surface`, `border-white/10`, `rounded-3xl`, and a hover border/glow transition.

```tsx
import Card from "@/components/ui/Card";

<Card>
  <h3 className="font-bold tracking-tight text-white">Realtime control</h3>
  <p className="mt-2 text-sm leading-6 text-body">...</p>
</Card>
```

### SectionHeading

File: `components/ui/SectionHeading.tsx`

Centered section intro with an uppercase sky eyebrow, large H2, optional gradient word, and optional grey subtitle.

```tsx
import SectionHeading from "@/components/ui/SectionHeading";

<SectionHeading
  eyebrow="Everything connected"
  title="Built for every screen"
  highlight="every screen"
  subtitle="Manage media, playlists, and displays from one place."
/>
```

### Container

File: `components/ui/Container.tsx`

```tsx
import Container from "@/components/ui/Container";

<Container className="py-20">
  ...
</Container>
```

## Interaction

- Use `transition duration-200` for hover and focus states.
- Primary buttons may lift slightly on hover: `hover:-translate-y-0.5`.
- Cards gain `hover:border-sky-500/40` and `hover:shadow-card`.
- Always provide visible keyboard focus: `focus-visible:ring-2 focus-visible:ring-sky-400/60`.
- Respect `prefers-reduced-motion` for any custom animation.

## Rules

1. Use the existing `cn()` helper for all conditional or merged class names.
2. Use design tokens and documented utilities before arbitrary hex values.
3. Keep primary actions on `brand-gradient`; do not invent alternate accent gradients.
4. Use `text-body` for paragraph copy and `text-muted` for supporting metadata.
5. Keep corners soft: buttons and chips are fully rounded, cards use `rounded-3xl`.
6. Keep glows blue and subtle. No heavy black or colored drop shadows.
7. Do not add a light theme.
8. Keep page backgrounds dark; use surfaces for elevation instead of light fills.
9. Do not modify the hero or auth pages as part of a general token change unless the task explicitly asks for it.
10. New reusable UI belongs in `components/ui/`.

## Key Files

- `app/globals.css` — Tailwind v4 theme tokens, gradients, global body styling
- `app/layout.tsx` — Plus Jakarta Sans, dark color scheme, theme color
- `components/ui/Button.tsx`
- `components/ui/Card.tsx`
- `components/ui/SectionHeading.tsx`
- `components/ui/Container.tsx`
- `lib/utils.ts` — `cn()` helper
