"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TOUR_STEPS } from "@/components/tour/tourSteps";

const STORAGE_KEY = "ss_tour_completed_v1";

export function TourMount() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const forced = searchParams.get("tour") === "1";
  const initialStep = Number(searchParams.get("step") || "1");

  const [mounted, setMounted] = useState(false);
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
    const done = localStorage.getItem(STORAGE_KEY) === "1";
    if (forced || !done) {
      setRunning(true);
      const safeIndex = Number.isFinite(initialStep) ? Math.max(0, Math.min(TOUR_STEPS.length - 1, initialStep - 1)) : 0;
      setIndex(safeIndex);
    }
  }, [forced, initialStep]);

  const current = TOUR_STEPS[index];
  const progress = `${index + 1}/${TOUR_STEPS.length}`;

  const onClose = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setRunning(false);
    if (forced) router.replace(pathname);
  };

  const onNext = () => {
    if (index >= TOUR_STEPS.length - 1) {
      onClose();
      return;
    }
    const nextIndex = index + 1;
    const next = TOUR_STEPS[nextIndex];
    setIndex(nextIndex);
    if (pathname !== next.path) {
      router.push(`${next.path}?tour=1&step=${nextIndex + 1}`);
    }
  };

  useEffect(() => {
    if (!running || !current) return;
    if (pathname !== current.path) return;
    const el = document.querySelector(current.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [running, current, pathname]);

  const spotlightStyle = useMemo(() => {
    if (!running || !current || pathname !== current.path) return null;
    const el = document.querySelector(current.target) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.max(0, r.top - 6),
      left: Math.max(0, r.left - 6),
      width: r.width + 12,
      height: r.height + 12
    };
  }, [running, current, pathname]);

  if (!mounted || !running || !current) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-40 bg-black/30" />
      {spotlightStyle ? (
        <div
          className="pointer-events-none fixed z-50 rounded-xl border-2 border-indigo-400 shadow-[0_0_0_200vmax_rgba(0,0,0,0.35)]"
          style={spotlightStyle}
        />
      ) : null}

      <div className="fixed bottom-4 right-4 z-[60] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <div className="mb-1 text-xs font-semibold text-indigo-600">Tour guiado · Senior-friendly · {progress}</div>
        <h3 className="text-base font-semibold text-slate-900">{current.title}</h3>
        <p className="mt-2 text-sm text-slate-700">{current.description}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Omitir
          </button>
          <button onClick={onNext} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700">
            {index >= TOUR_STEPS.length - 1 ? "Finalizar" : "Siguiente"}
          </button>
        </div>
      </div>
    </>
  );
}
