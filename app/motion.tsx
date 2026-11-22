"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP, ScrollTrigger);
export default function Motion() {
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".hero .poster > *", {y:18, opacity:0, duration:.65, stagger:.08, ease:"power2.out", clearProps:"transform,opacity"});
      for (const selector of [".coffee-scene > div", "#story > div", "#visit h2"]) {
        gsap.from(selector, {y:22, duration:.65, ease:"power2.out", scrollTrigger:{trigger:selector,start:"top 95%",once:true}});
      }
    });
    return () => media.revert();
  },[]);
  return null;
}
