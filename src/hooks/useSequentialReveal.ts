import { useEffect, useState } from "react";

export function useSequentialReveal(
  itemCount: number,
  trigger: string,
  delay = 650,
) {
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (!trigger || itemCount === 0) {
      setRevealedCount(0);
      return;
    }

    setRevealedCount(1);

    const timer = window.setInterval(() => {
      setRevealedCount((current) => {
        if (current >= itemCount) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, delay);

    return () => window.clearInterval(timer);
  }, [delay, itemCount, trigger]);

  return revealedCount;
}
