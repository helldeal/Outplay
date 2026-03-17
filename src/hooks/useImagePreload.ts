import { useEffect, useMemo, useState } from "react";

interface ImagePreloadState {
  isReady: boolean;
  total: number;
  loaded: number;
}

function preloadSingleImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";

    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    img.src = url;

    if (img.complete) {
      resolve();
    }
  });
}

export function useImagePreload(urls: (string | null | undefined)[]) {
  const normalizedUrls = useMemo(
    () =>
      Array.from(
        new Set(
          urls
            .filter((value): value is string => Boolean(value && value.trim()))
            .map((value) => value.trim()),
        ),
      ),
    [urls],
  );
  const urlsKey = useMemo(() => normalizedUrls.join("||"), [normalizedUrls]);

  const [state, setState] = useState<ImagePreloadState>({
    isReady: normalizedUrls.length === 0,
    total: normalizedUrls.length,
    loaded: normalizedUrls.length === 0 ? 0 : 0,
  });

  useEffect(() => {
    let cancelled = false;
    const total = normalizedUrls.length;

    if (total === 0) {
      setState({ isReady: true, total: 0, loaded: 0 });
      return;
    }

    setState({ isReady: false, total, loaded: 0 });

    let loaded = 0;
    const load = async () => {
      await Promise.all(
        normalizedUrls.map(async (url) => {
          await preloadSingleImage(url);
          loaded += 1;

          if (!cancelled) {
            setState({
              isReady: loaded >= total,
              total,
              loaded,
            });
          }
        }),
      );
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [urlsKey]);

  return state;
}
