import { useEffect, useRef, useState } from "react";

export function useInViewOnce<T extends Element>(options?: {
  threshold?: number;
  rootMargin?: string;
}) {
  const { threshold = 0.2, rootMargin = "0px" } = options ?? {};
  const ref = useRef<T | null>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    if (hasBeenVisible) {
      return;
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setHasBeenVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [hasBeenVisible, threshold, rootMargin]);

  return { ref, hasBeenVisible };
}
