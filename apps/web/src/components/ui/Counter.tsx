import { useEffect } from "react";
import { motion, useSpring, useTransform, type MotionValue } from "motion/react";

function Digit({ place, value, height }: { place: number; value: number; height: number }) {
  const rounded = Math.floor(value / place);
  const spring = useSpring(rounded, { stiffness: 260, damping: 26 });

  useEffect(() => {
    spring.set(rounded);
  }, [spring, rounded]);

  return (
    <span className="relative inline-block w-[1ch] overflow-hidden" style={{ height }}>
      {Array.from({ length: 10 }, (_, n) => (
        <DigitNumber height={height} key={n} mv={spring} number={n} />
      ))}
    </span>
  );
}

function DigitNumber({ mv, number, height }: { mv: MotionValue<number>; number: number; height: number }) {
  const y = useTransform(mv, (latest) => {
    const current = latest % 10;
    let offset = (10 + number - current) % 10;
    if (offset > 5) offset -= 10;
    return offset * height;
  });
  return (
    <motion.span className="absolute inset-0 flex items-center justify-center" style={{ y }}>
      {number}
    </motion.span>
  );
}

export function Counter({ value, height = 20, className }: { value: number; height?: number; className?: string }) {
  const digits = Math.max(1, String(Math.floor(value)).length);
  const places = Array.from({ length: digits }, (_, i) => 10 ** (digits - 1 - i));
  return (
    <span aria-label={value.toLocaleString("id-ID")} className={`inline-flex tabular-nums ${className ?? ""}`} role="text">
      {places.map((place) => (
        <Digit height={height} key={place} place={place} value={value} />
      ))}
    </span>
  );
}
