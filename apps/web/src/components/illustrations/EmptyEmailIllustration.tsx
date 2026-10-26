import { cn } from "@/lib/utils";

export function EmptyEmailIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("text-muted-foreground", className)}
      viewBox="0 0 1000 1000"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="empty-email-shadow"
          x1="481.93"
          x2="481.93"
          y1="262.73"
          y2="742.28"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient
          id="empty-email-body"
          x1="518.68"
          x2="518.68"
          y1="266.13"
          y2="720.17"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient
          id="empty-email-flap"
          x1="518.68"
          x2="518.68"
          y1="266.13"
          y2="576.37"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient
          id="empty-email-left"
          x1="300.7"
          x2="462.18"
          y1="709.28"
          y2="547.8"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient
          id="empty-email-right"
          x1="10246.9"
          x2="10246.9"
          y1="703.49"
          y2="553.85"
          gradientTransform="matrix(-1 0 0 1 10902.35 0)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient
          id="empty-email-badge"
          x1="516.05"
          x2="516.05"
          y1="494.11"
          y2="337.22"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.85" />
          <stop offset="1" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        d="M713.92,742.28H249.94c-7.56,0-13.68-6.13-13.68-13.68v-308.53c0-4.55,2.27-8.81,6.04-11.35l198.11-133.31c25.1-16.89,57.94-16.89,83.04,0l198.11,133.31c3.78,2.54,6.04,6.8,6.04,11.35v308.53c0,7.56-6.13,13.68-13.68,13.68Z"
        fill="url(#empty-email-shadow)"
      />
      <path
        d="M750.67,720.17h-463.98c-7.56,0-13.68-6.13-13.68-13.68v-283.02c0-4.55,2.27-8.81,6.04-11.35l198.11-133.31c25.1-16.89,57.94-16.89,83.04,0l198.11,133.31c3.78,2.54,6.04,6.8,6.04,11.35v283.02c0,7.56-6.13,13.68-13.68,13.68Z"
        fill="url(#empty-email-body)"
      />
      <path
        d="M764.35,423.45v.06l-211.79,142.52c-20.48,13.78-47.28,13.78-67.76,0l-211.79-142.52v-.06c0-4.56,2.27-8.81,6.04-11.35l198.11-133.31c25.1-16.89,57.94-16.89,83.04,0l198.11,133.31c3.77,2.54,6.04,6.8,6.04,11.35Z"
        fill="url(#empty-email-flap)"
      />
      <path
        d="M471.43,557.05l-175.44,146.2c-.44.36-1.09.31-1.45-.13l-2.2-2.64c-.37-.44-.31-1.09.13-1.45l174.21-145.17,4.76,3.2Z"
        fill="url(#empty-email-left)"
      />
      <path
        d="M565.78,557.05l175.44,146.2c.44.36,1.09.31,1.45-.13l2.2-2.64c.37-.44.31-1.09-.13-1.45l-174.21-145.17-4.76,3.2Z"
        fill="url(#empty-email-right)"
      />
      <rect
        fill="url(#empty-email-badge)"
        height="156.89"
        rx="24.76"
        ry="24.76"
        width="156.89"
        x="437.6"
        y="337.22"
      />
      <path
        d="M487.82,414.69c0-9.81,1.01-17.7,3.03-23.68,2.02-5.98,5.02-10.59,9-13.84,3.98-3.24,8.99-4.87,15.02-4.87,4.45,0,8.36.9,11.71,2.69,3.36,1.79,6.13,4.38,8.32,7.75,2.19,3.38,3.9,7.49,5.15,12.34,1.24,4.85,1.87,11.38,1.87,19.61,0,9.73-1,17.59-3,23.57-2,5.98-4.99,10.6-8.97,13.86-3.98,3.26-9.01,4.89-15.08,4.89-8,0-14.28-2.87-18.84-8.6-5.47-6.9-8.2-18.14-8.2-33.73ZM498.28,414.69c0,13.62,1.59,22.68,4.78,27.19,3.19,4.51,7.12,6.76,11.8,6.76s8.61-2.26,11.8-6.79c3.19-4.53,4.78-13.58,4.78-27.16s-1.59-22.73-4.78-27.22c-3.19-4.49-7.16-6.73-11.91-6.73s-8.41,1.98-11.2,5.94c-3.51,5.06-5.26,14.39-5.26,28.01Z"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  );
}
