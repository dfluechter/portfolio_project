'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface StackedCardData {
  image: string;
  title: string;
  description: string;
}

export interface StackedCardsInteractionProps {
  cards: StackedCardData[];
  spreadDistance?: number;
  rotationAngle?: number;
  animationDelay?: number;
  className?: string;
}

export const StackedCardsInteraction: React.FC<StackedCardsInteractionProps> = ({
  cards,
  spreadDistance = 40,
  rotationAngle = 5,
  animationDelay = 0.1,
  className,
}) => {
  const [isHovering, setIsHovering] = useState(false);

  // Auf maximal 3 Karten für den Fächer-Effekt beschränken
  const limitedCards = cards.slice(0, 3);

  return (
    <div
      className={cn(
        'relative w-full h-full flex items-center justify-center cursor-pointer select-none',
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative w-[350px] h-[400px]">
        {limitedCards.map((card, index) => {
          let xOffset = 0;
          let rotation = 0;

          if (limitedCards.length > 1 && isHovering) {
            // Erste Karte bleibt zentriert, zweite fächert links auf, dritte rechts
            if (index === 1) {
              xOffset = -spreadDistance;
              rotation = -rotationAngle;
            } else if (index === 2) {
              xOffset = spreadDistance;
              rotation = rotationAngle;
            }
          }

          return (
            <motion.div
              key={index}
              className="absolute inset-0 w-[350px] h-[400px] bg-white dark:bg-slate-900 rounded-2xl shadow-md dark:shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col transition-colors duration-200"
              animate={{
                x: xOffset,
                rotate: rotation,
                scale: isHovering && index !== 0 ? 0.98 : 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                delay: index * animationDelay,
              }}
              style={{
                zIndex: limitedCards.length - index,
              }}
            >
              {card.image && (
                <div className="relative h-72 rounded-xl shadow-sm overflow-hidden w-[calc(100%-1rem)] mx-2 mt-2 bg-slate-100 dark:bg-slate-800">
                  <img
                    src={card.image}
                    alt={card.title || 'card'}
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                </div>
              )}
              {(card.title || card.description) && (
                <div className="px-4 py-2.5 flex flex-col gap-y-1">
                  {card.title && (
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {card.title}
                    </h3>
                  )}
                  {card.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {card.description}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default StackedCardsInteraction;
