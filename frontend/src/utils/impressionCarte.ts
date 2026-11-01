import { useRef } from "react";
import { ouvrirDocument } from "./documentImprimable";

/** Imprime seulement la carte (format carte bancaire). */
export function useImpressionCarte() {
  const ref = useRef<HTMLDivElement>(null);
  const imprimer = () => {
    const html = ref.current?.innerHTML;
    if (!html) return;
    ouvrirDocument(`<!doctype html><html><head><meta charset="utf-8"><title>Carte patient</title>
      <style>@page{size:85.6mm 54mm;margin:0}body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
      .carte-patient{width:85.6mm!important;height:54mm!important;box-shadow:none!important;border-radius:3mm!important}</style></head>
      <body>${html}</body></html>`, "carte-patient");
  };
  return { ref, imprimer };
}
