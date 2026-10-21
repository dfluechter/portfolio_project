import React from 'react';
import { StackedCardsInteraction, type StackedCardData } from './stacked-cards-interaction';

const SAMPLE_CARDS: StackedCardData[] = [
  {
    title: 'Cloud Architecture & Kubernetes',
    description: 'High-availability microservices running on EKS & GKE with zero-downtime rolling deploys.',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Backend Systems Engineering',
    description: 'Scalable Django REST & PostgreSQL backend services handling mission-critical data pipelines.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Reactive Frontend Design',
    description: 'Accessible, performance-optimized React 19 interfaces built with Tailwind CSS & Framer Motion.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
  },
];

export const StackedCardsDemo: React.FC = () => {
  return (
    <div className="py-12 flex flex-col items-center justify-center">
      <div className="mb-6 text-center">
        <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-500">
          Interactive Micro-Interaction
        </span>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
          Stacked Cards Preview
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Fahre mit der Maus über den Stapel, um die Karten aufzufächern.
        </p>
      </div>
      <StackedCardsInteraction cards={SAMPLE_CARDS} spreadDistance={50} rotationAngle={6} />
    </div>
  );
};

export default StackedCardsDemo;
