"use client";

import { useState, useCallback, useRef } from "react";

const RED = "#D44A3D";

const ORDERABLE_ITEMS = [
  { id: "nasi-bakar-3-rasa", name: "Nasi Bakar 3 Rasa (Ayam, Cumi, Ikan)", price: 14 },
  { id: "cendol", name: "Cendol", price: 5 },
  { id: "nasi-bakar-and-cendol", name: "Nasi Bakar and Cendol", price: 16 },
  { id: "nasi-ulam-betawi", name: "Nasi Ulam Betawi", price: 17 },
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
  const [errorMsg, setErrorMsg] = useState("");

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const validateStep = useCallback((): string | null => {
    if (step === "personal") {
      if (!personal.name.trim()) return "Please enter your name.";
      if (personal.name.length > 255) return "Name is too long (max 255 characters).";
      if (!personal.email.trim()) return "Please enter your email.";
      if (!EMAIL_REGEX.test(personal.email)) return "Please enter a valid email address.";
      if (!personal.phone.trim()) return "Please enter your phone number.";
    }
    if (step === "order") {
      const total = Object.values(quantities).reduce((a, b) => a + b, 0);
      if (total <= 0) return "Please add at least one item to your order.";
    }
    if (step === "payment") {
      if (!paymentFile) return "Please upload your proof of payment.";
      if (paymentFile.size > MAX_FILE_SIZE) return "File is too large (max 10 MB).";
    }
    return null;
  }, [step, personal, quantities, paymentFile]);

  const goNext = useCallback(async () => {
    const err = validateStep();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg("");

    if (step === "payment") {
      if (!paymentFile) return;
      setSubmitting(true);
      try {
        const form = new FormData();
        form.append("personal", JSON.stringify({ ...personal }));
        form.append("quantities", JSON.stringify({ ...quantities }));
        form.append("proof", paymentFile);
        const res = await fetch("/api/order", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setErrorMsg(body?.error || "Something went wrong. Please try again.");
          return;
        }
        setStep("confirmation");
      } catch (e) {
        console.error("Order submit failed:", e);
        setErrorMsg("Could not submit order. Please check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    const next = getNextStep(step);
    if (next) setStep(next);
  }, [step, personal, quantities, paymentFile, validateStep]);

  const goPrev = useCallback(() => {
    setErrorMsg("");
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
      <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
        <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8] px-3 sm:px-5 pb-4 sm:pb-6">
          <div className="flex justify-center -mt-6 -mb-4 overflow-hidden">
            <img
              src="/hero-group.png"
              alt="Nibbles and nOOk crew"
              className="w-[80%] max-w-[290px] h-auto object-contain mt-[-12%]"
            />
          </div>
          <div className="pb-2 text-center text-[#D44A3D]">
            <p className="font-baby-doll text-lg sm:text-xl leading-none">Welcome to</p>
            <div className="-mt-1 flex justify-center">
              <img
                src="/logo-nnn.png"
                alt="Nibbles & nOOk"
                className="w-[65%] max-w-[260px] h-auto object-contain"
              />
            </div>
          </div>
          <div className="relative px-1 sm:px-2 pb-2">
            <div className="rounded-3xl bg-[#D44A3D] px-3 sm:px-4 py-3 text-[#fff4dd] mr-[35%] sm:mr-[145px]">
              <h2 className="font-baby-doll text-base sm:text-[20px] leading-none mb-2">What do we have?</h2>
              <ul className="font-baby-doll text-sm sm:text-[18px] leading-[1.15] tracking-tight space-y-[1px]">
                <li>-No pork for items below-</li>
                <li>Nasi Bakar 3 Rasa (Ayam, Cumi, Ikan): $14</li>
                <li>Cendol: $5</li>
                <li>Nasi Bakar and Cendol: $16</li>
                <li>Nasi Ulam Betawi: $17</li>
              </ul>
            </div>
            <img
              src="/camera-girl.png"
              alt="Camera girl decoration"
              className="absolute right-0 bottom-0 w-[33%] sm:w-[200px] h-auto object-contain"
            />
          </div>
          <div className="flex justify-center pt-3 pb-1">
            <button
              type="button"
              onClick={() => setStep("personal")}
              className="font-baby-doll px-6 sm:px-8 py-2 rounded-full bg-[#D44A3D] text-[#fff4dd] text-2xl sm:text-[32px] leading-none hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#D44A3D] focus:ring-offset-2 focus:ring-offset-[var(--cream)] transition-opacity"
            >
              Order
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ----- Personal info (poster style) -----
  if (step === "personal") {
    return (
      <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
        <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8] px-4 sm:px-6 pt-5 pb-4">
          <div className="flex justify-center mb-2">
            <img
              src="/logo-nnn.png"
              alt="Nibbles & nOOk"
              className="w-[45%] max-w-[180px] h-auto object-contain"
            />
          </div>
          <h2 className="font-baby-doll text-[#D44A3D] text-xl sm:text-2xl font-bold text-center mb-5">
            Fill in your personal info!
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="font-baby-doll text-[#D44A3D] text-lg sm:text-xl font-bold w-[80px] sm:w-[90px] shrink-0">Name:</label>
              <input
                type="text"
                value={personal.name}
                onChange={(e) => { setPersonal((p) => ({ ...p, name: e.target.value })); setErrorMsg(""); }}
                placeholder="Your name"
                className="flex-1 px-4 py-2.5 rounded-full text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                style={{ backgroundColor: RED }}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="font-baby-doll text-[#D44A3D] text-lg sm:text-xl font-bold w-[80px] sm:w-[90px] shrink-0">Email:</label>
              <input
                type="email"
                value={personal.email}
                onChange={(e) => { setPersonal((p) => ({ ...p, email: e.target.value })); setErrorMsg(""); }}
                placeholder="you@example.com"
                className="flex-1 px-4 py-2.5 rounded-full text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                style={{ backgroundColor: RED }}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="font-baby-doll text-[#D44A3D] text-lg sm:text-xl font-bold w-[80px] sm:w-[90px] shrink-0">Phone:</label>
              <input
                type="tel"
                value={personal.phone}
                onChange={(e) => { setPersonal((p) => ({ ...p, phone: e.target.value })); setErrorMsg(""); }}
                placeholder="+1 234 567 8900"
                className="flex-1 px-4 py-2.5 rounded-full text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                style={{ backgroundColor: RED }}
              />
            </div>
          </div>
          {errorMsg && (
            <p className="font-baby-doll text-[#D44A3D] text-sm bg-[#D44A3D]/10 rounded-xl px-4 py-2 mt-3 text-center">{errorMsg}</p>
          )}
          <div className="flex items-end justify-between mt-2">
            <img
              src="/guitar-guy.png"
              alt="Guitar guy decoration"
              className="w-[40%] max-w-[160px] h-auto object-contain"
            />
            <div className="flex gap-2 pb-2">
              <button
                type="button"
                onClick={goPrev}
                className="font-baby-doll px-5 py-1.5 rounded-full border-2 text-[#D44A3D] text-lg hover:bg-[#D44A3D]/10 focus:outline-none transition-colors"
                style={{ borderColor: RED }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => goNext()}
                className="font-baby-doll px-5 py-1.5 rounded-full bg-[#D44A3D] text-[#fff4dd] text-lg hover:opacity-95 focus:outline-none transition-opacity"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ----- Order step (poster style) -----
  if (step === "order") {
    return (
      <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
        <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8] px-4 sm:px-6 pt-5 pb-4">
          <div className="flex justify-center mb-2">
            <img src="/logo-nnn.png" alt="Nibbles & nOOk" className="w-[45%] max-w-[180px] h-auto object-contain" />
          </div>
          <h2 className="font-baby-doll text-[#D44A3D] text-xl sm:text-2xl font-bold text-center mb-5">
            Tell us your order, {personal.name || "there"}!
          </h2>
          <div className="space-y-4">
            {ORDERABLE_ITEMS.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="font-baby-doll text-[#D44A3D] text-lg sm:text-xl font-bold leading-tight">{item.name}:</p>
                  <p className="font-baby-doll text-[#D44A3D] text-base sm:text-lg">($ {item.price})</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { setQuantity(item.id, -1); setErrorMsg(""); }}
                    className="w-9 h-9 rounded-xl bg-[#D44A3D] text-white font-bold text-lg hover:opacity-90 focus:outline-none flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="w-10 h-9 rounded-xl bg-[#D44A3D] text-white font-bold text-lg flex items-center justify-center">
                    {quantities[item.id] ?? 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setQuantity(item.id, 1); setErrorMsg(""); }}
                    className="w-9 h-9 rounded-xl bg-[#D44A3D] text-white font-bold text-lg hover:opacity-90 focus:outline-none flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          {errorMsg && (
            <p className="font-baby-doll text-[#D44A3D] text-sm bg-[#D44A3D]/10 rounded-xl px-4 py-2 mt-3 text-center">{errorMsg}</p>
          )}
          <div className="relative mt-3">
            <img
              src="/rabbit-waiter.png"
              alt="Rabbit waiter decoration"
              className="w-[40%] max-w-[160px] h-auto object-contain"
            />
            <div className="absolute bottom-2 right-0 flex gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="font-baby-doll px-5 py-1.5 rounded-full border-2 text-[#D44A3D] text-lg hover:bg-[#D44A3D]/10 focus:outline-none transition-colors"
                style={{ borderColor: RED }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => goNext()}
                className="font-baby-doll px-5 py-1.5 rounded-full bg-[#D44A3D] text-[#fff4dd] text-lg hover:opacity-95 focus:outline-none transition-opacity"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ----- Payment step (poster style) -----
  if (step === "payment") {
    return (
      <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
        <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8] px-4 sm:px-6 pt-5 pb-4">
          <div className="flex justify-center mb-2">
            <img src="/logo-nnn.png" alt="Nibbles & nOOk" className="w-[45%] max-w-[180px] h-auto object-contain" />
          </div>
          <h2 className="font-baby-doll text-[#D44A3D] text-xl sm:text-2xl font-bold text-center mb-5">
            Please attach proof of payment here!
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              setPaymentFile(e.target.files?.[0] ?? null);
              setErrorMsg("");
              e.target.value = "";
            }}
          />
          <div
            className="w-full py-10 rounded-2xl text-center text-white cursor-pointer transition-opacity hover:opacity-90"
            style={{ backgroundColor: RED }}
            onClick={() => fileInputRef.current?.click()}
          >
            {paymentFile ? (
              <div className="flex flex-col items-center gap-2">
                <span className="font-baby-doll text-xl font-medium">{paymentFile.name}</span>
                <span className="font-baby-doll text-sm underline opacity-90">Change file</span>
              </div>
            ) : (
              <span className="font-baby-doll text-2xl font-bold">Insert File</span>
            )}
          </div>
          <div className="mt-4 px-1">
            <p className="font-baby-doll text-[#D44A3D] text-base sm:text-lg leading-snug">
              Don&apos;t forget to insert note of the food.
            </p>
            <p className="font-baby-doll text-[#D44A3D] text-base sm:text-lg leading-snug">
              Ex: {personal.name || "Nathan"} - Bakmi (2), Tiramisu (1)
            </p>
          </div>
          {errorMsg && (
            <p className="font-baby-doll text-[#D44A3D] text-sm bg-[#D44A3D]/10 rounded-xl px-4 py-2 mt-3 text-center">{errorMsg}</p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={goPrev}
              className="font-baby-doll px-5 py-1.5 rounded-full border-2 text-[#D44A3D] text-lg hover:bg-[#D44A3D]/10 focus:outline-none transition-colors"
              style={{ borderColor: RED }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => goNext()}
              disabled={submitting}
              className="font-baby-doll px-5 py-1.5 rounded-full bg-[#D44A3D] text-[#fff4dd] text-lg hover:opacity-95 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting ? "Submitting..." : "Next"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ----- Confirmation step -----
  return (
    <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
      <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8] px-4 sm:px-6 pt-5 pb-4">
        <div className="flex justify-center mb-2">
          <img src="/logo-nnn.png" alt="Nibbles & nOOk" className="w-[45%] max-w-[180px] h-auto object-contain" />
        </div>
        <h2 className="font-baby-doll text-[#D44A3D] text-2xl sm:text-3xl font-bold text-center mb-5">
          Thank you for your order!
        </h2>
        <div className="space-y-2 text-center font-baby-doll text-[#D44A3D] text-base sm:text-lg">
          <p>For any questions, feel free to reach out to Michael</p>
          <p>
            <a href="tel:+12368775949" className="underline">+1 (236) 877-5949</a>
          </p>
          <div className="pt-2">
            <p>Pickup at Metrotown Station,</p>
            <p>December 7th at 4-5 PM</p>
          </div>
        </div>
        <div className="flex justify-center mt-4">
          <img
            src="/bye-group.png"
            alt="Thank you!"
            className="w-[75%] max-w-[300px] h-auto object-contain"
          />
        </div>
      </div>
    </main>
  );
}
