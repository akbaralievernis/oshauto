'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

interface BottomSheetProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * Snap point Y-offsets are calculated from the *expanded* (full) position:
 *  - full      → 0 (whole sheet visible)
 *  - half      → ~ half of the sheet is hidden
 *  - collapsed → only the handle + title row is visible
 */
export function BottomSheet({ children, title = 'Ош маршруттары' }: BottomSheetProps) {
  const controls = useAnimation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [snaps, setSnaps] = useState<{ full: number; half: number; collapsed: number }>({
    full: 0,
    half: 320,
    collapsed: 540
  });

  // Recalculate snap points based on viewport height.
  useEffect(() => {
    const compute = () => {
      const vh = window.innerHeight;
      // Sheet height = 88vh (see className below).
      const sheetH = vh * 0.88;
      const HANDLE = 64; // visible handle area when collapsed
      setSnaps({
        full: 0,
        half: Math.round(sheetH * 0.5),
        collapsed: Math.round(sheetH - HANDLE)
      });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Start in the half-open position.
  useEffect(() => {
    controls.start({ y: snaps.half, transition: { type: 'spring', damping: 28, stiffness: 230 } });
  }, [snaps.half, controls]);

  const snapTo = (y: number) =>
    controls.start({ y, transition: { type: 'spring', damping: 28, stiffness: 230 } });

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const currentY = (info.point.y as number) ?? 0;
    const velocity = info.velocity.y;

    // We need the sheet's actual offset, not just the point. Use the current `y`
    // value tracked by framer-motion via getBoundingClientRect.
    const sheet = sheetRef.current;
    if (!sheet) return;
    const rect = sheet.getBoundingClientRect();
    const offsetFromTopOfSheet = rect.top; // distance from viewport top
    const vh = window.innerHeight;
    const sheetTop = offsetFromTopOfSheet - (vh - rect.height); // 0 = full open

    let target: number;
    if (Math.abs(velocity) > 600) {
      target = velocity > 0 ? snaps.collapsed : snaps.full;
    } else {
      const candidates = [snaps.full, snaps.half, snaps.collapsed];
      target = candidates.reduce((prev, curr) =>
        Math.abs(curr - sheetTop) < Math.abs(prev - sheetTop) ? curr : prev
      );
    }
    snapTo(target);
    void currentY;
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-end">
      <motion.div
        ref={sheetRef}
        drag="y"
        dragElastic={0.04}
        dragMomentum={false}
        dragConstraints={{ top: 0, bottom: snaps.collapsed }}
        onDragEnd={handleDragEnd}
        initial={{ y: snaps.collapsed }}
        animate={controls}
        className="w-full max-w-md mx-auto h-[88vh] glass-panel pointer-events-auto flex flex-col rounded-t-3xl overflow-hidden shadow-2xl"
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
      >
        <button
          onClick={() => snapTo(snaps.full)}
          className="flex flex-col items-center pt-2.5 pb-3 cursor-grab active:cursor-grabbing border-b border-[var(--border-color)] w-full select-none"
          aria-label="Раскрыть"
        >
          <div className="w-12 h-1.5 bg-[var(--text-muted)] opacity-40 rounded-full mb-1.5" />
          <div className="flex items-center gap-1.5">
            <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <h2 className="text-xs font-bold text-[var(--text-secondary)] tracking-widest uppercase">
              {title}
            </h2>
          </div>
        </button>

        <div className="flex-1 overflow-y-auto p-4 pb-12">{children}</div>
      </motion.div>
    </div>
  );
}
