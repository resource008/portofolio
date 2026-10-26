import { useCallback, useEffect, useRef, type ReactNode } from "react";

/**
 * ClickSpark — diadaptasi dari React Bits (reactbits.dev/animations/click-spark).
 * Memercikkan garis-garis kecil dari titik klik di atas kanvas transparan.
 */
interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  extraScale?: number;
  /** Bila false, klik tidak memercikkan apa pun (mis. saat unlike). */
  active?: boolean;
  className?: string;
  children?: ReactNode;
}

const easeOut = (t: number) => t * (2 - t);

export function ClickSpark({
  sparkColor = "#f43f5e",
  sparkSize = 8,
  sparkRadius = 18,
  sparkCount = 8,
  duration = 400,
  extraScale = 1,
  active = true,
  className,
  children,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const frameRef = useRef<number | null>(null);

  // Kanvas mengikuti ukuran pembungkus (plus ruang untuk percikan di luar tepi).
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const resize = () => {
      const { width, height } = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = (width + sparkRadius * 4) * dpr;
      canvas.height = (height + sparkRadius * 4) * dpr;
      canvas.style.width = `${width + sparkRadius * 4}px`;
      canvas.style.height = `${height + sparkRadius * 4}px`;
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    resize();
    return () => observer.disconnect();
  }, [sparkRadius]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  const draw = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= duration) return false;
        const eased = easeOut(elapsed / duration);
        const distance = eased * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - eased);
        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);
        ctx.strokeStyle = sparkColor;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return true;
      });

      frameRef.current = sparksRef.current.length > 0 ? requestAnimationFrame(draw) : null;
    },
    [duration, extraScale, sparkColor, sparkRadius, sparkSize],
  );

  const handleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Klik via keyboard tidak punya koordinat → percik dari tengah.
    const fromKeyboard = event.detail === 0;
    const x = fromKeyboard ? rect.width / 2 : event.clientX - rect.left;
    const y = fromKeyboard ? rect.height / 2 : event.clientY - rect.top;
    const now = performance.now();
    for (let i = 0; i < sparkCount; i++) {
      sparksRef.current.push({ x, y, angle: (2 * Math.PI * i) / sparkCount, startTime: now });
    }
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(draw);
  };

  return (
    <span className={`relative inline-flex ${className ?? ""}`} onClickCapture={handleClick}>
      <canvas
        aria-hidden
        className="pointer-events-none absolute z-10"
        ref={canvasRef}
        style={{ left: -sparkRadius * 2, top: -sparkRadius * 2 }}
      />
      {children}
    </span>
  );
}
