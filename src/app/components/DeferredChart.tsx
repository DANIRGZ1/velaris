import { useState, useEffect, useRef, useCallback, cloneElement, type ReactElement } from "react";

/**
 * DeferredContainer — replaces recharts ResponsiveContainer entirely.
 *
 * Uses a persistent wrapper div + ResizeObserver to measure actual pixel
 * dimensions, then clones the chart child with explicit width/height props.
 * This completely eliminates the "width(-1) height(-1)" warning because
 * we never render a chart until we have confirmed positive dimensions,
 * and we never rely on recharts' own measurement logic.
 */
export function DeferredContainer({
  children,
  width: _w,
  height: _h,
  minWidth: _mw,
  minHeight: _mh,
  ...rest
}: {
  children: ReactElement;
  width?: string | number;
  height?: string | number;
  minWidth?: number;
  minHeight?: number;
  [key: string]: unknown;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    if (!ref.current) return;
    const { clientWidth, clientHeight } = ref.current;
    if (clientWidth > 0 && clientHeight > 0) {
      setSize((prev) => {
        if (prev && prev.w === clientWidth && prev.h === clientHeight) return prev;
        return { w: clientWidth, h: clientHeight };
      });
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Initial measure
    measure();

    // Watch for size changes (route transitions, tab switches, resize, etc.)
    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      ref={ref}
      style={{ width: "100%", height: "100%", minWidth: 1, minHeight: 1 }}
      {...rest}
    >
      {size && size.w > 0 && size.h > 0
        ? cloneElement(children as ReactElement<Record<string, unknown>>, { width: size.w, height: size.h })
        : (
          // Skeleton placeholder — prevents layout collapse flash while measuring
          <div className="w-full h-full animate-pulse rounded-lg bg-secondary/30" />
        )}
    </div>
  );
}