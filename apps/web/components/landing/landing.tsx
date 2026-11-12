"use client";

import { MotionConfig } from "motion/react";
import { Cta, Footer, Stats, WhyNear } from "./closing";
import { Faq } from "./faq";
import { Hero } from "./hero";
import { How } from "./how";
import { Integrate } from "./integrate";
import { SmoothScroll } from "./motion";
import { LandingNav } from "./nav";
import { Threats } from "./threats";

export function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScroll />
      <div className="overflow-x-clip">
        <LandingNav />
        {/* One framed column: sections are separated by hairlines, edges by side rules. */}
        <div className="mx-auto max-w-6xl lg:border-x">
          <main>
            <Hero />
            <Threats />
            <How />
            <Stats />
            <Integrate />
            <WhyNear />
            <Faq />
            <Cta />
          </main>
          <Footer />
        </div>
      </div>
    </MotionConfig>
  );
}
