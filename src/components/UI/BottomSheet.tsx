'use client';

import React, { useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface BottomSheetProps {
  children: React.ReactNode;
  title?: string;
  isOpen?: boolean;
}

export function BottomSheet({ children, title = 'Ош маршруттары' }: BottomSheetProps) {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Пресеты высоты (анимационные точки шторки)
  const snapPoints = {
    full: 0,
    half: 350,
    collapsed: 620,
  };

  // Метод для ручного сдвига шторки
  const snapTo = (point: number) => {
    controls.start({ y: point, transition: { type: 'spring', damping: 25, stiffness: 200 } });
  };

  // Логика перетаскивания шторки
  const handleDragEnd = (event: any, info: any) => {
    const velocity = info.velocity.y;
    const currentY = info.point.y;
    const offset = info.offset.y;

    // Определяем ближайшую точку примагничивания
    const draggedTo = info.offset.y > 0 ? 'down' : 'up';
    
    if (Math.abs(velocity) > 500) {
      if (velocity > 0) {
        // Быстрое движение вниз
        if (info.offset.y < snapPoints.half) {
          snapTo(snapPoints.half);
        } else {
          snapTo(snapPoints.collapsed);
        }
      } else {
        // Быстрое движение вверх
        if (info.offset.y > snapPoints.half) {
          snapTo(snapPoints.half);
        } else {
          snapTo(snapPoints.full);
        }
      }
    } else {
      // Медленное движение (примагничивание к ближайшему snap-поинту)
      const currentPosition = info.offset.y;
      const distances = [
        { name: 'full', val: snapPoints.full, dist: Math.abs(currentPosition - snapPoints.full) },
        { name: 'half', val: snapPoints.half, dist: Math.abs(currentPosition - snapPoints.half) },
        { name: 'collapsed', val: snapPoints.collapsed, dist: Math.abs(currentPosition - snapPoints.collapsed) }
      ];
      
      const closest = distances.reduce((prev, curr) => (prev.dist < curr.dist ? prev : curr));
      snapTo(closest.val);
    }
  };

  return (
    <div
      ref={constraintsRef}
      className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-end"
    >
      <motion.div
        drag="y"
        dragElastic={0.08}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        dragConstraints={{ top: 0, bottom: 620 }}
        onDragEnd={handleDragEnd}
        initial={{ y: 350 }}
        animate={controls}
        className="w-full max-w-md mx-auto h-[90vh] glass-panel pointer-events-auto flex flex-col rounded-t-[24px] overflow-hidden"
        style={{
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        {/* Кнопка-слайдер для перетаскивания */}
        <div className="flex flex-col items-center py-3 cursor-grab active:cursor-grabbing border-b border-[var(--border-color)]">
          <div className="w-12 h-1.5 bg-[var(--text-muted)] opacity-40 rounded-full mb-1" />
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] tracking-wide uppercase">
            {title}
          </h2>
        </div>

        {/* Контент шторки */}
        <div className="flex-1 overflow-y-auto p-4 pb-12 select-none">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
