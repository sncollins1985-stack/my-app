"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const MAGIC_WORD_TEXT = "YOU DIDN'T SAY THE MAGIC WORD! ";
const LINES_TO_FILL = 30;
const LINE_ADD_INTERVAL = 120;

export function NedryScreen({ onRetry }: { onRetry: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [showRetry, setShowRetry] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let count = 0;

    const interval = setInterval(() => {
      count += 1;
      setLines((prev) => [...prev, MAGIC_WORD_TEXT]);

      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }

      if (count >= LINES_TO_FILL) {
        clearInterval(interval);
        setTimeout(() => setShowRetry(true), 600);
      }
    }, LINE_ADD_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0000cc]">
      <div className="relative flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 overflow-hidden p-4 font-mono text-sm md:text-base">
          {lines.map((line, index) => (
            <div
              key={`${line}-${index}`}
              className="whitespace-nowrap font-bold leading-tight text-white animate-in fade-in slide-in-from-left-2 duration-150"
            >
              {line}
            </div>
          ))}
        </div>

        <div className="absolute right-0 top-0 flex h-[70%] w-[280px] items-center justify-center bg-white md:w-[320px] lg:w-[380px]">
          <Image
            src="/images/dennis-nedry.gif"
            alt="Dennis Nedry wagging his finger"
            width={380}
            height={280}
            className="h-auto max-h-full w-auto max-w-full object-contain"
            unoptimized
            priority
          />
        </div>
      </div>

      {showRetry ? (
        <div className="flex animate-in justify-center fade-in zoom-in pb-8 pt-2 duration-300">
          <button
            onClick={onRetry}
            className="rounded-md border-2 border-white bg-[#0000aa] px-8 py-3 font-mono text-lg font-bold text-white transition-all hover:bg-[#0000ee] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95"
          >
            {">> RETRY <<"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
