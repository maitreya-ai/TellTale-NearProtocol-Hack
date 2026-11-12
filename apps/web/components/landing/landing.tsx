"use client";

import { MotionConfig } from "motion/react";
import { Cta, Footer, Stats, WhyNear } from "./closing";
import { Hero } from "./hero";
import { SmoothScroll } from "./motion";
import { LandingNav } from "./nav";
import { Story } from "./story";
import { Threats } from "./threats";

export function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScroll />
      <LandingNav />
      <main className="overflow-x-clip">
        <Hero />
        <Threats />
        <Story />
        <Stats />
        <WhyNear />
        <Cta />
      </main>
      <Footer />
    </MotionConfig>
  );
}
