"use client";

import { useState, useCallback, useRef } from "react";
import { MenuFlyerImage } from "./MenuFlyerImage";

const RED = "#D44A3D";

const ORDERABLE_ITEMS = [
  { id: "pork-bakmie", name: "Pork Bakmie", price: 14 },
  { id: "earl-grey-tiramisu", name: "Earl Grey Tiramisu", price: 12 },
  { id: "chestnut-tiramisu", name: "Chestnut Tiramisu", price: 12 },
  { id: "choipan", name: "Choipan", price: 13 },
] as const;

type Step = "landing" | "personal" | "order" | "payment" | "confirmation";

interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
}

interface OrderQuantities {
  [key: string]: number;
}

const STEPS: Step[] = ["landing", "personal", "order", "payment", "confirmation"];

function getNextStep(current: Step): Step | null {
  const i = STEPS.indexOf(current);
  return i < STEPS.length - 1 ? STEPS[i + 1]! : null;
}

function getPrevStep(current: Step): Step | null {
  const i = STEPS.indexOf(current);
  return i > 0 ? STEPS[i - 1]! : null;
}

export function OrderFlow() {
  const [step, setStep] = useState<Step>("landing");
  const [personal, setPersonal] = useState<PersonalInfo>({
    name: "",
    email: "",
    phone: "",
  });
  const [quantities, setQuantities] = useState<OrderQuantities>(() =>
    ORDERABLE_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {})
  );
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);

  const goNext = useCallback(async () => {
    if (step === "payment") {
      if (!paymentFile) return;
      setSubmitting(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
        const form = new FormData();
        form.append("personal", JSON.stringify({ ...personal }));
        form.append("quantities", JSON.stringify({ ...quantities }));
        form.append("proof", paymentFile);
        const res = await fetch(`${apiUrl}/api/order`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) throw new Error(await res.text());
        setStep("confirmation");
      } catch (e) {
        console.error("Order submit failed:", e);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    const next = getNextStep(step);
    if (next) setStep(next);
  }, [step, personal, quantities]);

  const goPrev = useCallback(() => {
    const prev = getPrevStep(step);
    if (prev) setStep(prev);
  }, [step]);

  const setQuantity = useCallback((id: string, delta: number) => {
    setQuantities((q) => ({
      ...q,
      [id]: Math.max(0, (q[id] ?? 0) + delta),
    }));
  }, []);

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
  const orderTotal = ORDERABLE_ITEMS.reduce(
    (sum, item) => sum + (quantities[item.id] ?? 0) * item.price,
    0
  );

  // ----- Landing -----
  if (step === "landing") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8]">
          <div className="relative w-full bg-[var(--cream)] flex flex-col items-center justify-center pt-8 pb-2 px-6">
            <p className="text-[#D44A3D] text-sm font-medium mb-1">Welcome to</p>
            <h1 className="font-baby-doll text-[#D44A3D] text-3xl md:text-4xl font-bold text-center tracking-tight">
              Nibbles & nOOk
            </h1>
            <MenuFlyerImage />
          </div>
          <div className="p-5 pb-6">
            <div className="rounded-xl bg-[#D44A3D] p-4 text-white">
              <h2 className="text-lg font-semibold mb-3">What do we have?</h2>
              <ul className="space-y-1.5 text-sm">
                {ORDERABLE_ITEMS.map((item) => (
                  <li key={item.id}>
                    {item.name}: <span className="font-medium">${item.price}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setStep("personal")}
              className="font-baby-doll mt-4 w-full py-3 rounded-full bg-[#D44A3D] text-white font-semibold text-lg shadow hover:bg-[#c24135] focus:outline-none focus:ring-2 focus:ring-[#D44A3D] focus:ring-offset-2 focus:ring-offset-[var(--cream)] transition-colors"
            >
              Order
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ----- Shared layout for steps 1–4: header + content + nav -----
  const stepTitles: Record<Exclude<Step, "landing">, string> = {
    personal: "Fill in your personal info!",
    order: `Tell us your order, ${personal.name || "there"}!`,
    payment: "Please attach proof of payment here!",
    confirmation: "Thank you for your order!",
  };

  const renderStepContent = () => {
    switch (step) {
      case "personal":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: RED }}>
                Name
              </label>
              <input
                type="text"
                value={personal.name}
                onChange={(e) => setPersonal((p) => ({ ...p, name: e.target.value }))}
                placeholder="Your name"
                className="w-full px-4 py-2 rounded-xl text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                style={{ backgroundColor: RED }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: RED }}>
                Email
              </label>
              <input
                type="email"
                value={personal.email}
                onChange={(e) => setPersonal((p) => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full px-4 py-2 rounded-xl text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                style={{ backgroundColor: RED }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: RED }}>
                Phone
              </label>
              <input
                type="tel"
                value={personal.phone}
                onChange={(e) => setPersonal((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+1 234 567 8900"
                className="w-full px-4 py-2 rounded-xl text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                style={{ backgroundColor: RED }}
              />
            </div>
          </div>
        );

      case "order":
        return (
          <div className="space-y-4">
            {ORDERABLE_ITEMS.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-xl py-2 px-3"
                style={{ backgroundColor: RED }}
              >
                <span className="text-white text-sm flex-1">
                  {item.name}: ($ {item.price})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.id, -1)}
                    className="w-8 h-8 rounded-lg bg-white/20 text-white font-bold hover:bg-white/30 focus:outline-none"
                  >
                    -
                  </button>
                  <span className="text-white w-8 text-center font-medium">
                    {quantities[item.id] ?? 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.id, 1)}
                    className="w-8 h-8 rounded-lg bg-white/20 text-white font-bold hover:bg-white/30 focus:outline-none"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      case "payment":
        return (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                setPaymentFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <div
              className="w-full py-8 rounded-xl text-center text-white transition-opacity"
              style={{ backgroundColor: RED }}
            >
              {paymentFile ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="font-medium">{paymentFile.name}</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm underline opacity-90 hover:opacity-100"
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full h-full cursor-pointer hover:opacity-90 focus:outline-none"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Insert File
                </button>
              )}
            </div>
          </div>
        );

      case "confirmation":
        return (
          <div className="space-y-3 text-left" style={{ color: RED }}>
            <p>For any questions, feel free to reach out to Michael</p>
            <p>
              <a href="tel:+12368775949" className="underline">+1 (236) 877-5949</a>
            </p>
            <p>Pickup at Metrotown Station.</p>
            <p>December 7th at 4-5 PM</p>
          </div>
        );

      default:
        return null;
    }
  };

  const showNext =
    step !== "confirmation" &&
    (step !== "personal" || (personal.name && personal.email && personal.phone)) &&
    (step !== "order" || totalItems > 0) &&
    (step !== "payment" || paymentFile);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8]">
        <div className="pt-6 px-6 pb-2">
          <h1 className="font-baby-doll text-2xl text-center" style={{ color: RED }}>
            Nibbles & nOOk
          </h1>
          <h2 className="text-lg font-bold mt-2 text-center" style={{ color: RED }}>
            {stepTitles[step]}
          </h2>
        </div>
        <div className="p-5 pb-6 space-y-4">
          {renderStepContent()}
          <div className="flex gap-2 pt-2">
            {getPrevStep(step) && (
              <button
                type="button"
                onClick={goPrev}
                className="flex-1 py-3 rounded-full border-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--cream)]"
                style={{ borderColor: RED, color: RED }}
              >
                Back
              </button>
            )}
            {step !== "confirmation" && (
              <button
                type="button"
                onClick={() => goNext()}
                disabled={!showNext || submitting}
                className="flex-1 py-3 rounded-full text-white font-semibold text-lg shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--cream)] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: RED }}
              >
                {submitting ? "..." : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
