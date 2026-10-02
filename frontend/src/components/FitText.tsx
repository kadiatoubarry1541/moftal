import { useLayoutEffect, useRef, type ReactNode } from "react";

// Texte qui rapetisse jusqu'à tenir entièrement sur sa ligne — jamais coupé
// avec « … ». Sert à la carte profil de l'accueil : un nom long s'écrit en
// plus petit au lieu d'agrandir la carte.
export function FitText({ children, maxSize, minSize = 6, className = "" }: {
  children: ReactNode;
  maxSize: number;
  minSize?: number;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      let size = maxSize;
      el.style.fontSize = `${size}px`;
      while (size > minSize && el.scrollWidth > el.clientWidth) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, maxSize, minSize]);

  return (
    <p ref={ref} className={`whitespace-nowrap overflow-hidden ${className}`} style={{ fontSize: maxSize }}>
      {children}
    </p>
  );
}
