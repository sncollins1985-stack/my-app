import { cn } from "@/lib/utils";

interface ForrestLogoProps {
  className?: string;
}

export function ForrestLogo({ className }: ForrestLogoProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      aria-hidden="true"
      className={cn("size-12", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#forrest-logo-clip)">
        <rect x="6" y="6" width="39" height="39" rx="9" fill="#A9B384" />
        <rect x="51" y="6" width="39" height="39" rx="9" fill="#6F8650" />
        <rect x="6" y="51" width="39" height="39" rx="9" fill="#6F8650" />
        <rect x="51" y="51" width="39" height="39" rx="9" fill="#A9B384" />

        <path
          d="M48 4V92"
          stroke="#F7F4EA"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M4 48H92"
          stroke="#F7F4EA"
          strokeWidth="7"
          strokeLinecap="round"
        />

        <path
          d="M18 18L32 32M32 12L18 34M18 58L32 50M16 74L34 64M16 88L34 78"
          stroke="#F7F4EA"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M78 16L62 24M80 30L60 40M80 46L60 56M62 62L74 76M58 74L68 90"
          stroke="#F7F4EA"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 16L34 40M18 28L34 52"
          stroke="#F7F4EA"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M60 12L80 22M60 26L80 38M60 44L80 54M58 58L72 86M72 58L84 78"
          stroke="#F7F4EA"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="forrest-logo-clip">
          <rect width="96" height="96" rx="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
