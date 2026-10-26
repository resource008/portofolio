import { cn } from "@/lib/utils";

/**
 * "Empty box" illustration. The original SVG used hardcoded gradient colors;
 * here every stop is mapped to `currentColor` with different opacity levels so
 * the whole illustration follows the text color (e.g. `text-primary`).
 */
export function EmptyBoxIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("text-muted-foreground", className)}
      viewBox="0 0 1000 1000"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="empty-box-shadow"
          x1="324.12"
          x2="324.12"
          y1="694.2"
          y2="751.94"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient
          id="empty-box-right"
          x1="593.11"
          x2="593.11"
          y1="410"
          y2="782.04"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient
          id="empty-box-left"
          x1="357.06"
          x2="357.06"
          y1="410"
          y2="782.04"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient
          id="empty-box-top-right"
          x1="627.37"
          x2="627.37"
          y1="410"
          y2="509.45"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient
          id="empty-box-top-left"
          x1="329.35"
          x2="329.35"
          y1="410"
          y2="509.45"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient
          id="empty-box-fly-a"
          x1="2650.49"
          x2="2682.62"
          y1="2151.55"
          y2="2151.55"
          gradientTransform="rotate(99.41 2428.42 302.985)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="empty-box-fly-b"
          x1="1031.19"
          x2="1063.32"
          y1="-1093.78"
          y2="-1093.78"
          gradientTransform="scale(1 -1) rotate(-46.37 1791.682 -83.414)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="empty-box-fly-body"
          x1="546.48"
          x2="595.95"
          y1="124.84"
          y2="124.84"
          gradientTransform="rotate(-4.18 2407.907 311.086)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.85" />
          <stop offset="1" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
        <linearGradient
          id="empty-box-trail"
          x1="417.51"
          x2="417.51"
          y1="263.52"
          y2="401.02"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      <polygon
        fill="url(#empty-box-shadow)"
        points="93.59 699.2 384.54 694.2 554.66 746.94 287.7 751.94 93.59 699.2"
      />
      <g>
        <polygon
          fill="url(#empty-box-right)"
          points="758.5 761.1 427.72 782.04 427.72 410 758.5 410 758.5 761.1"
        />
        <polygon
          fill="url(#empty-box-left)"
          points="286.4 751.94 427.72 782.04 427.72 410 286.4 410 286.4 751.94"
        />
        <polygon
          fill="url(#empty-box-top-right)"
          points="827.02 509.45 493.15 509.45 427.72 410 758.5 410 827.02 509.45"
        />
        <polygon
          fill="url(#empty-box-top-left)"
          points="230.97 509.45 375.38 509.45 427.72 410 286.4 410 230.97 509.45"
        />
      </g>
      <g>
        <path
          d="M563.43,251.57c-6.76-1.12-10.14-14.72-9.02-21.48s7.51-11.34,14.27-10.22c6.76,1.12,11.33,7.51,10.21,14.28-1.12,6.76-8.71,18.54-15.47,17.42Z"
          fill="url(#empty-box-fly-a)"
        />
        <path
          d="M558.05,253.23c4.96-4.73.11-17.87-4.62-22.83-4.73-4.96-12.59-5.15-17.55-.42-4.96,4.73-5.15,12.59-.42,17.55,4.73,4.96,17.63,10.43,22.59,5.71Z"
          fill="url(#empty-box-fly-b)"
        />
        <path
          d="M571.46,273.4c-6.29.7-13.01.54-19.47-.49-4.56-.87-10.21-2.25-12.61-6.34-1.41-2.39-1.78-5.25-1.28-7.92,1.78-8.08,10.79-10.32,18.39-12.61,7.15-1.83,15.37-3.82,22.11-.2,5.07,2.47,8.81,7.77,8.68,13.47-.02,8.24-8.03,13.25-15.61,14.06l-.21.03Z"
          fill="url(#empty-box-fly-body)"
        />
        <path
          d="M535.8,401.02s-.01,0-.02,0c-.55-.01-.99-.47-.98-1.02.59-25.77-11.49-27.61-56.41-34.43-29.15-4.43-73.21-11.12-136.35-28.08-30.23-8.12-44.56-16.2-43.81-24.69,1.14-12.81,38.77-24.99,111.87-36.2,54.1-8.29,108.57-13.02,109.12-13.07.56-.06,1.03.36,1.08.91.05.55-.36,1.03-.91,1.08-.54.05-54.96,4.77-109,13.06-89.76,13.76-109.45,26.3-110.17,34.4-.44,4.99,6.54,12.96,42.34,22.58,63.03,16.94,107.02,23.62,136.13,28.04,45.12,6.85,58.74,8.92,58.11,36.45-.01.54-.46.98-1,.98Z"
          fill="url(#empty-box-trail)"
        />
      </g>
    </svg>
  );
}
