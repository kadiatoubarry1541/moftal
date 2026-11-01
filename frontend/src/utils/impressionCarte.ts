import { useRef } from "react";

/** Imprime seulement la carte (format carte bancaire). */
export function useImpressionCarte() {
  const ref = useRef<HTMLDivElement>(null);
  const imprimer = () => {
    const html = ref.current?.innerHTML;
    if (!html) return;
    const w = window.open("", "_blank", "width=480,height=360");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Carte patient</title>
      <style>@page{size:85.6mm 54mm;margin:0}body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}
      .carte-patient{width:85.6mm!important;height:54mm!important;box-shadow:none!important;border-radius:3mm!important}</style></head>
      <body>${html}<script>window.onload=function(){setTimeout(function(){window.print();},300)}</script></body></html>`);
    w.document.close();
  };
  return { ref, imprimer };
}
