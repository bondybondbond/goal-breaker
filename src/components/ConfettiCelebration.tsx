import React, { useEffect, useState } from 'react';

interface ConfettiCelebrationProps {
  isVisible: boolean;
  type: 'humble' | 'nice' | 'awesome' | 'epic';
  onComplete: () => void;
}

const CONFETTI_COLORS = [
  '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3'
];

// Celebration configurations for different types
const CELEBRATION_CONFIGS = {
  humble: {
    duration: 1500,
    emoji: '👍',
    particles: 0,
    scale: 'scale-150'
  },
  nice: {
    duration: 2000,
    emoji: '🙌',
    particles: 8,
    scale: 'scale-125'
  },
  awesome: {
    duration: 2500,
    emoji: '🎉',
    particles: 25,
    scale: 'scale-110'
  },
  epic: {
    duration: 3500,
    emoji: '🚀',
    particles: 50,
    scale: 'scale-200'
  }
};

const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({ 
  isVisible, 
  type,
  onComplete
}) => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    rotation: number;
    delay: number;
  }>>([]);

  const config = CELEBRATION_CONFIGS[type];

  useEffect(() => {
    if (!isVisible) {
      setParticles([]);
      return;
    }

    // Generate particles based on type
    if (config.particles > 0) {
      const newParticles = Array.from({ length: config.particles }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 20 + 10,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: Math.random() * (type === 'epic' ? 10 : 6) + 4,
        rotation: Math.random() * 360,
        delay: Math.random() * 500,
      }));
      setParticles(newParticles);
    }

    // Auto-complete after duration
    const timer = setTimeout(() => {
      onComplete();
    }, config.duration);

    return () => clearTimeout(timer);
  }, [isVisible, type, config, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Confetti particles (only for types with particles) */}
      {config.particles > 0 && particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute ${type === 'epic' ? 'animate-epic-fall' : 'animate-confetti-fall'}`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            borderRadius: type === 'epic' ? '50%' : '2px',
            transform: `rotate(${particle.rotation}deg)`,
            animationDelay: `${particle.delay}ms`,
            animationDuration: type === 'epic' ? '3s' : '2.5s',
          }}
        />
      ))}

      {/* Main celebration emoji */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div 
          className={`text-6xl ${config.scale} ${
            type === 'epic' ? 'animate-epic-rocket' : 
            type === 'awesome' ? 'animate-awesome-bounce' :
            type === 'nice' ? 'animate-nice-burst' : 
            'animate-humble-zoom'
          }`}
          style={{
            animationDuration: `${config.duration}ms`,
            filter: type === 'epic' ? 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))' : 'none'
          }}
        >
          {config.emoji}
        </div>
      </div>

      {/* Epic rocket trail effect */}
      {type === 'epic' && (
        <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2">
          <div className="animate-rocket-trail w-2 bg-gradient-to-t from-orange-400 via-yellow-300 to-transparent h-screen opacity-60" />
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes humble-zoom {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.8) rotate(180deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.8) rotate(360deg); opacity: 0; }
        }

        @keyframes nice-burst {
          0% { transform: translate(-50%, -50%) scale(0) rotate(-30deg); opacity: 0; }
          30% { transform: translate(-50%, -50%) scale(1.4) rotate(15deg); opacity: 1; }
          70% { transform: translate(-50%, -50%) scale(1.2) rotate(-10deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.7) rotate(0deg); opacity: 0; }
        }

        @keyframes awesome-bounce {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          20% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
          40% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          60% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
        }

        @keyframes epic-rocket {
          0% { transform: translate(-50%, 50vh) scale(1) rotate(0deg); opacity: 0; }
          20% { transform: translate(-50%, -20vh) scale(1.5) rotate(0deg); opacity: 1; }
          80% { transform: translate(-50%, -50vh) scale(2) rotate(5deg); opacity: 1; }
          100% { transform: translate(-50%, -100vh) scale(0.5) rotate(10deg); opacity: 0; }
        }

        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scale(0.5); opacity: 0; }
        }

        @keyframes epic-fall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(120vh) rotate(1080deg) scale(0.3); opacity: 0; }
        }

        @keyframes rocket-trail {
          0% { height: 0; opacity: 0; }
          30% { height: 60vh; opacity: 0.8; }
          100% { height: 100vh; opacity: 0; }
        }

        .animate-humble-zoom { animation: humble-zoom forwards; }
        .animate-nice-burst { animation: nice-burst forwards; }
        .animate-awesome-bounce { animation: awesome-bounce forwards; }
        .animate-epic-rocket { animation: epic-rocket forwards; }
        .animate-confetti-fall { animation: confetti-fall 2.5s ease-out forwards; }
        .animate-epic-fall { animation: epic-fall 3s ease-out forwards; }
        .animate-rocket-trail { animation: rocket-trail 3.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ConfettiCelebration;