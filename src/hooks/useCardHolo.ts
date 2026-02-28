import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/**
 * Hook that tracks mouse movement over a card element and
 * sets CSS custom properties used by cards.css holographic effects.
 *
 * Also manages the active (expanded/centered) state with FLIP
 * animations so the card smoothly flies from / back to its slot.
 */
export function useCardHolo({ disabled = false }: { disabled?: boolean } = {}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [interacting, setInteracting] = useState(false);
  const [active, setActive] = useState(false);
  const [closing, setClosing] = useState(false);
  /** Stashed grid-slot rect so we can animate back */
  const slotRect = useRef<DOMRect | null>(null);
  /** Ref to the collapse FLIP animation so we can cancel it precisely */
  const flipAnimRef = useRef<Animation | null>(null);

  const getRotator = (el: HTMLElement) =>
    el.querySelector<HTMLElement>(".card__rotator");

  // ───── holo mouse tracking ─────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;

    const rotatorEl = getRotator(el) ?? el;
    const rect = rotatorEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

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

    const rotator = getRotator(el);
    if (rotator) {
      rotator.style.transition =
        "transform 0.6s ease-out, box-shadow 0.4s ease";
      rotator.style.transform = "rotateY(0deg) rotateX(0deg)";
    }
    setInteracting(false);
  }, []);

  // ───── FLIP expand / collapse ─────

  const expand = useCallback(() => {
    const el = cardRef.current;
    if (!el || active || disabled) return;

    // 1. Capture current position in the grid
    slotRect.current = el.getBoundingClientRect();

    // 2. Flip to active (CSS will position it fixed-center)
    setActive(true);
  }, [active, disabled]);

  // FLIP animation: runs BEFORE the browser paints so there's no flash.
  // Handles both expand (active true) and collapse cleanup (active false).
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    if (active && slotRect.current) {
      // ── Expand: animate from grid slot → fixed center ──
      const afterRect = el.getBoundingClientRect();
      const fromRect = slotRect.current;

      const dx =
        fromRect.left +
        fromRect.width / 2 -
        (afterRect.left + afterRect.width / 2);
      const dy =
        fromRect.top +
        fromRect.height / 2 -
        (afterRect.top + afterRect.height / 2);
      const sw = fromRect.width / afterRect.width;

      el.animate(
        [
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${sw})`,
          },
          { transform: "translate(-50%, -50%) scale(1)" },
        ],
        {
          duration: 420,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "none",
        },
      );
    } else if (!active && flipAnimRef.current) {
      // ── Collapse finished: .active class is now removed by React.
      //    Cancel only the FLIP animation (not CSS transitions like box-shadow)
      //    BEFORE the browser paints → no flicker.
      flipAnimRef.current.cancel();
      flipAnimRef.current = null;
    }
  }, [active]);

  const collapse = useCallback(() => {
    const el = cardRef.current;
    if (!el || !active) return;

    // Start closing state (keeps backdrop visible for exit anim)
    setClosing(true);

    // Find where the placeholder slot currently is
    const placeholder = document.querySelector(
      `[data-card-placeholder="${el.dataset.cardId}"]`,
    );
    const targetRect = placeholder?.getBoundingClientRect() ?? slotRect.current;
    if (!targetRect) {
      setActive(false);
      setClosing(false);
      return;
    }

    const currentRect = el.getBoundingClientRect();
    const dx =
      targetRect.left +
      targetRect.width / 2 -
      (currentRect.left + currentRect.width / 2);
    const dy =
      targetRect.top +
      targetRect.height / 2 -
      (currentRect.top + currentRect.height / 2);
    const sw = targetRect.width / currentRect.width;

    const anim = el.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)" },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${sw})`,
        },
      ],
      {
        duration: 380,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );
    flipAnimRef.current = anim;
    anim.onfinish = () => {
      // State updates trigger re-render → .active removed → useLayoutEffect
      // cancels the FLIP animation before the browser paints. No flicker.
      setActive(false);
      setClosing(false);
      slotRect.current = null;
    };
  }, [active]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (active) {
        collapse();
      } else {
        expand();
      }
    },
    [active, expand, collapse],
  );

  // Close on Escape
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") collapse();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, collapse]);

  return {
    cardRef,
    interacting,
    active,
    closing,
    close: collapse,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
    },
  } as const;
}
