"use client";

import { useState } from "react";

export function MenuFlyerImage() {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <div className="relative w-full max-h-[320px] mt-4 flex justify-center min-h-[120px]">
      <img
        src="/menu.png"
        alt="Nibbles & nOOk menu"
        className={`max-w-full h-auto max-h-[320px] object-contain object-top transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
