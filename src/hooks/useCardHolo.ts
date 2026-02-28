import { useCallback, useRef, useState } from "react";

/**
 * Hook that tracks mouse movement over a card element and
 * sets CSS custom properties used by cards.css holographic effects.
 *
 * Sets the transform directly on the .card__rotator so that
 * CSS transitions can smoothly interpolate on mouse-leave.
 */
export function useCardHolo() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [interacting, setInteracting] = useState(false);

  const getRotator = (el: HTMLElement) =>
    el.querySelector<HTMLElement>(".card__rotator");

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0 → 1
    const y = (e.clientY - rect.top) / rect.height; // 0 → 1

    const pxStr = `${x * 100}%`;
    const pyStr = `${y * 100}%`;
    const hyp = Math.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2);

    const s = el.style;
    s.setProperty("--mx", pxStr);
    s.setProperty("--my", pyStr);
    s.setProperty("--posx", pxStr);
    s.setProperty("--posy", pyStr);
    s.setProperty("--pos", `${pxStr} ${pyStr}`);
    s.setProperty("--hyp", hyp.toFixed(4));
    s.setProperty("--o", "1");

    // Set transform directly on rotator so CSS transitions can interpolate
    const rotator = getRotator(el);
    if (rotator) {
      rotator.style.transition = "box-shadow 0.4s ease";
      rotator.style.transform = `rotateY(${(x - 0.5) * 26}deg) rotateX(${(y - 0.5) * -26}deg)`;
    }

    setInteracting(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;

    const s = el.style;
    s.setProperty("--mx", "50%");
    s.setProperty("--my", "50%");
    s.setProperty("--posx", "50%");
    s.setProperty("--posy", "50%");
    s.setProperty("--pos", "50% 50%");
    s.setProperty("--hyp", "0");
    s.setProperty("--o", "0");

    // Smooth transition back to flat position
    const rotator = getRotator(el);
    if (rotator) {
      rotator.style.transition =
        "transform 0.6s ease-out, box-shadow 0.4s ease";
      rotator.style.transform = "rotateY(0deg) rotateX(0deg)";
    }

    setInteracting(false);
  }, []);

  return {
    cardRef,
    interacting,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
    },
  } as const;
}
