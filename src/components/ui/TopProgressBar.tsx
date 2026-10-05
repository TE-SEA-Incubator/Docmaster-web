import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function TopProgressBar() {
  const location = useLocation();
  const barRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    clearTimeout(timerRef.current);
    bar.style.width = "0%";
    bar.style.opacity = "1";

    requestAnimationFrame(() => {
      bar.style.transition = "width 3s cubic-bezier(0.08, 0.82, 0.17, 1)";
      bar.style.width = "80%";
    });

    const onReady = () => {
      bar.style.transition = "width 0.3s ease";
      bar.style.width = "100%";
      timerRef.current = setTimeout(() => {
        bar.style.opacity = "0";
        bar.style.transition = "opacity 0.3s ease";
      }, 300);
    };

    const safety = setTimeout(onReady, 3000);
    window.addEventListener("page:ready", onReady, { once: true });

    return () => {
      clearTimeout(safety);
      clearTimeout(timerRef.current);
      window.removeEventListener("page:ready", onReady);
    };
  }, [location.pathname, location.search]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] h-[3px]">
      <div
        ref={barRef}
        className="h-full bg-[#E8923A] rounded-r-full shadow-[0_0_8px_#E8923A]"
        style={{ width: "0%", transition: "none" }}
      />
    </div>
  );
}
