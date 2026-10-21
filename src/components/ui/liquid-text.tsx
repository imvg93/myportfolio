"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

const MORPH_SECONDS = 1.35;
const PAUSE_SECONDS = 0.75;

type MorphingTextProps = {
  className?: string;
  texts: string[];
};

function useMorphingText(texts: string[]) {
  const textIndex = useRef(0);
  const progress = useRef(0);
  const cooldown = useRef(PAUSE_SECONDS);
  const previousTime = useRef(0);
  const firstText = useRef<HTMLSpanElement>(null);
  const secondText = useRef<HTMLSpanElement>(null);

  const renderFrame = useCallback((fraction: number) => {
    const first = firstText.current;
    const second = secondText.current;
    if (!first || !second || texts.length === 0) return;

    const clamped = Math.max(0, Math.min(1, fraction));
    const inverse = 1 - clamped;
    first.textContent = texts[textIndex.current % texts.length];
    second.textContent = texts[(textIndex.current + 1) % texts.length];
    first.style.filter = `blur(${Math.min(8 / inverse - 8, 100)}px)`;
    second.style.filter = `blur(${Math.min(8 / clamped - 8, 100)}px)`;
    first.style.opacity = String(Math.pow(inverse, 0.4));
    second.style.opacity = String(Math.pow(clamped, 0.4));
  }, [texts]);

  useEffect(() => {
    if (texts.length < 2) {
      renderFrame(0);
      return;
    }

    textIndex.current = 0;
    progress.current = 0;
    cooldown.current = PAUSE_SECONDS;
    previousTime.current = 0;
    renderFrame(0);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let frameId = 0;
    const animate = (now: number) => {
      if (previousTime.current === 0) previousTime.current = now;
      const delta = Math.min((now - previousTime.current) / 1000, 0.1);
      previousTime.current = now;

      if (cooldown.current > 0) {
        cooldown.current = Math.max(0, cooldown.current - delta);
        renderFrame(0);
      } else {
        progress.current += delta;
        const fraction = Math.min(progress.current / MORPH_SECONDS, 1);
        renderFrame(fraction);
        if (fraction === 1) {
          textIndex.current = (textIndex.current + 1) % texts.length;
          progress.current = 0;
          cooldown.current = PAUSE_SECONDS;
        }
      }

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [renderFrame, texts]);

  return { firstText, secondText };
}

export function MorphingText({ texts, className }: MorphingTextProps) {
  const { firstText, secondText } = useMorphingText(texts);
  const filterId = useId().replaceAll(":", "");

  return (
    <div
      role="img"
      aria-label="Greetings in many languages"
      className={cn(
        "relative mx-auto h-[1.5em] w-full max-w-full overflow-visible text-center font-sans text-[clamp(2rem,8vw,4rem)] font-normal leading-none tracking-normal",
      )}
      style={{ filter: `url(#liquid-threshold-${filterId})` }}
    >
      <span
        ref={firstText}
        aria-hidden="true"
        className={cn("absolute inset-x-0 top-1/2 mx-auto inline-block w-full -translate-y-1/2 whitespace-nowrap", className)}
      />
      <span
        ref={secondText}
        aria-hidden="true"
        className={cn("absolute inset-x-0 top-1/2 mx-auto inline-block w-full -translate-y-1/2 whitespace-nowrap", className)}
      />
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <filter
          id={`liquid-threshold-${filterId}`}
          x="-20%"
          y="-35%"
          width="140%"
          height="170%"
        >
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 18 -7"
          />
        </filter>
      </svg>
    </div>
  );
}
