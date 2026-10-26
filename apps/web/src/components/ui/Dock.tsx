import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
  type SpringOptions,
} from "motion/react";
import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";

import "./dock.css";

export type DockMenuEntry =
  | { separator: true }
  | {
      separator?: false;
      label: React.ReactNode;
      onClick?: () => void;
      checked?: boolean;
      items?: DockMenuEntry[];
    };

export type DockAppItem = {
  separator?: false;
  icon?: React.ReactNode;
  label: React.ReactNode;
  onClick?: () => void;
  className?: string;
  content?: React.ReactNode;
  active?: boolean;
  badge?: number | string;
  menu?: DockMenuEntry[];
  menuOnClick?: boolean;
};

export type DockItemData = DockAppItem | { separator: true };

export type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
  animateIn?: boolean;
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemSize: number;
  magnification: number;
  label?: React.ReactNode;
  animateIn?: boolean;
  active?: boolean;
  badge?: number | string;
  menu?: DockMenuEntry[];
  menuOnClick?: boolean;
};

function DockItem({
  children,
  className = "",
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  label,
  animateIn = false,
  active = false,
  badge,
  menu,
  menuOnClick = false,
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const longPress = useRef<number | undefined>(undefined);
  const hasMenu = Boolean(menu && menu.length > 0);

  const mouseDistance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize,
    };
    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize],
  );
  const size = useSpring(targetSize, spring);

  // Tap pada trigger memicu pointerdown (menutup) lalu click; tanpa ini menu terbuka lagi.
  const closedAt = useRef(0);
  const closeMenu = () => {
    closedAt.current = Date.now();
    setMenuOpen(false);
  };

  const handleClick = () => {
    if (menuOnClick && hasMenu) {
      if (Date.now() - closedAt.current > 300) setMenuOpen(true);
    }
    else onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      initial={animateIn ? { opacity: 0, y: 28, scale: 0.8 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={
        hasMenu
          ? (e) => {
              e.preventDefault();
              setMenuOpen(true);
            }
          : undefined
      }
      onTouchStart={
        hasMenu
          ? () => {
              longPress.current = window.setTimeout(() => setMenuOpen(true), 500);
            }
          : undefined
      }
      onTouchEnd={hasMenu ? () => window.clearTimeout(longPress.current) : undefined}
      className={`dock-item ${active ? "dock-item--running" : ""} ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup={hasMenu ? "menu" : undefined}
      aria-current={active ? "true" : undefined}
      aria-label={typeof label === "string" ? label : undefined}
    >
      {badge !== undefined && badge !== 0 && badge !== "" ? (
        <span className="dock-badge">{badge}</span>
      ) : null}
      {active ? <span aria-hidden="true" className="dock-indicator" /> : null}
      {menuOpen && menu ? <DockMenu entries={menu} onClose={closeMenu} /> : null}
      {Children.map(children, (child) =>
        isValidElement(child)
          ? cloneElement(child as React.ReactElement<{ isHovered?: MotionValue<number> }>, {
              isHovered,
            })
          : child,
      )}
    </motion.div>
  );
}

function DockMenuList({
  entries,
  onClose,
  className = "",
}: {
  entries: DockMenuEntry[];
  onClose: () => void;
  className?: string;
}) {
  const [openSub, setOpenSub] = useState<number | null>(null);

  return (
    <div className={`dock-menu ${className}`} role="menu">
      {entries.map((entry, index) =>
        entry.separator ? (
          <div className="dock-menu-separator" key={index} role="separator" />
        ) : (
          <div
            className="dock-menu-row"
            key={index}
            onMouseEnter={() => setOpenSub(entry.items ? index : null)}
          >
            <button
              aria-checked={entry.checked}
              className="dock-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                if (entry.items) {
                  setOpenSub(openSub === index ? null : index);
                  return;
                }
                entry.onClick?.();
                onClose();
              }}
              role={entry.checked !== undefined ? "menuitemcheckbox" : "menuitem"}
              type="button"
            >
              <span className="dock-menu-check">{entry.checked ? "✓" : ""}</span>
              <span className="dock-menu-label">{entry.label}</span>
              {entry.items ? <span className="dock-menu-arrow">›</span> : null}
            </button>
            {entry.items && openSub === index ? (
              <DockMenuList className="dock-menu--sub" entries={entry.items} onClose={onClose} />
            ) : null}
          </div>
        ),
      )}
    </div>
  );
}

function DockMenu({ entries, onClose }: { entries: DockMenuEntry[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="dock-menu-anchor" onClick={(e) => e.stopPropagation()} ref={ref}>
      <DockMenuList entries={entries} onClose={onClose} />
    </div>
  );
}

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockLabel({ children, className = "", isHovered }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const unsubscribe = isHovered.on("change", (latest) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`dock-label ${className}`}
          role="tooltip"
          style={{ x: "-50%" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className = "" }: { className?: string; children: React.ReactNode }) {
  return <div className={`dock-icon ${className}`}>{children}</div>;
}

export default function Dock({
  items,
  className = "",
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 50,
  animateIn = false,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 4),
    [magnification, dockHeight],
  );
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <motion.div style={{ height, scrollbarWidth: "none" }} className="dock-outer">
      <motion.div
        onMouseMove={({ pageX }) => {
          isHovered.set(1);
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        className={`dock-panel ${className}`}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Application dock"
      >
        {items.map((item, index) =>
          item.separator ? (
            <div aria-hidden="true" className="dock-separator" key={index} />
          ) : (
          <DockItem
            key={index}
            active={item.active}
            animateIn={animateIn}
            badge={item.badge}
            className={item.className}
            label={item.label}
            menu={item.menu}
            menuOnClick={item.menuOnClick}
            baseItemSize={baseItemSize}
            distance={distance}
            magnification={magnification}
            mouseX={mouseX}
            onClick={item.onClick}
            spring={spring}
          >
            <DockIcon>{item.content ?? item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
          ),
        )}
      </motion.div>
    </motion.div>
  );
}
