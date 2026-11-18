"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ABOUT_IMAGES, ABOUT_STORY, VIDEO_SRC } from "@/lib/about-content";

export default function AboutStory() {
  const reducedMotion = useReducedMotion();
  const [reduce, setReduce] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setReduce(Boolean(reducedMotion));
  }, [reducedMotion]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => setIsVisible(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVisible && !reduce && !videoFailed) {
      const playback = video.play();
      if (playback) void playback.catch(() => {});
    } else {
      video.pause();
    }
  }, [isVisible, reduce, videoFailed]);

  const revealProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 } as const,
        whileInView: { opacity: 1, y: 0 } as const,
        viewport: { once: true } as const,
        transition: { duration: 0.6 },
      };

  return (
    <section className="py-24">
      <div className="mx-auto max-w-[1540px] px-6">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <motion.div {...revealProps}>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              {ABOUT_STORY.chip}
            </p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
              {ABOUT_STORY.heading}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#94a3b8]">
              {ABOUT_STORY.paragraph}
            </p>
          </motion.div>

          <motion.div {...revealProps}>
            <div
              ref={frameRef}
              className="relative aspect-video w-full overflow-hidden rounded-[40px] lg:aspect-[4/5]"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 30px 80px -30px rgba(14,165,233,0.45)",
              }}
            >
              {reduce || videoFailed ? (
                <Image
                  src={ABOUT_IMAGES[0].src}
                  alt={ABOUT_IMAGES[0].alt}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={VIDEO_SRC}
                  poster={ABOUT_IMAGES[0].src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onError={() => setVideoFailed(true)}
                  className="h-full w-full object-cover"
                  aria-label={ABOUT_STORY.heading}
                />
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
