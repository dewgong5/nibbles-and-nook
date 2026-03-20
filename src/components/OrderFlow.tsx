"use client";

import { useState, useCallback, useRef } from "react";
import { DEFAULT_RSVP_PRICE_DOLLARS } from "@/lib/orders-schema";

const RED = "#D44A3D";

const CHILI_OPTIONS = [
  "Cabe Ijo",
  "Sambal Matah",
  "Sambal Bawang",
  "Sambal Terasi"
] as const;

const ORDERABLE_ITEMS = [
  { id: "nasi-kulit-ayam", name: "Nasi Kulit Ayam", price: 11 },
  { id: "nasi-ayam-geprek", name: "Nasi Ayam Geprek", price: 13 },
  { id: "nasi-oseng-sapi", name: "Nasi Oseng Sapi", price: 15 },
] as const;

type Step = "landing" | "personal" | "select" | "order" | "payment" | "confirmation";

interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
}

interface OrderQuantities {
  [key: string]: number;
}

interface OrderChilis {
  [key: string]: string[];
}

const PICKUP_OPTIONS = [
  { id: "sabtu-metrotown", label: "Saturday, 7th March — Metrotown", time: "5:00 – 6:00 PM" },
  { id: "minggu-iec", label: "Sunday, 8th March — Indonesian Evangelical Church", time: "11:30 AM – 12:00 PM" },
] as const;

const STEPS: Step[] = ["landing", "personal", "select", "order", "payment", "confirmation"];

export function OrderFlow() {
  const [step, setStep] = useState<Step>("landing");
  const [choice, setChoice] = useState<"rsvp" | "order" | "">("");
  const [personal, setPersonal] = useState<PersonalInfo>({
    name: "",
    email: "",
    phone: "",
  });
  const [quantities, setQuantities] = useState<OrderQuantities>(() =>
    ORDERABLE_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {})
  );
  const [chilis, setChilis] = useState<OrderChilis>(() =>
    ORDERABLE_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: [] }), {})
  );  
  const [activeChiliModal, setActiveChiliModal] = useState<string | null>(null);

  const [pickup, setPickup] = useState("");
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const getChiliDisplayString = (itemId: string) => {
    const list = chilis[itemId] || [];
    if (list.length === 0) return "";
    
    const counts = list.reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([name, count]) => `${name} (${count})`)
      .join(", ");
  };

  const validateStep = useCallback((): string | null => {
    if (step === "personal") {
      if (!personal.name.trim()) return "Please enter your name.";
      if (personal.name.length > 255) return "Name is too long (max 255 characters).";
      if (!personal.email.trim()) return "Please enter your email.";
      if (!EMAIL_REGEX.test(personal.email)) return "Please enter a valid email address.";
      if (!personal.phone.trim()) return "Please enter your phone number.";
    }
    if (step === "select") {
      if (!choice) return "Please select an option to continue.";
    }
    if (step === "order") {
      const total = Object.values(quantities).reduce((a, b) => a + b, 0);
      if (total <= 0) return "Please add at least one item to your order.";
      for (const item of ORDERABLE_ITEMS) {
        if (quantities[item.id] > (chilis[item.id]?.length || 0)) {
          return `Please finish selecting chili for all ${item.name} portions.`;
        }
      }
    }
    // if (step === "pickup") {
    //   if (!pickup) return "Please select a pickup option.";
    // }
    if (step === "payment") {
      if (!paymentFile) return "Please upload your proof of payment.";
      if (paymentFile.size > MAX_FILE_SIZE) return "File is too large (max 10 MB).";
    }
    return null;
  }, [step, personal, choice, quantities, chilis, pickup, paymentFile]);

  const goNext = useCallback(async () => {
    const err = validateStep();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg("");

    if (step === "select") {
      if (choice === "rsvp") {
        setStep("payment");
        return;
      }
      setStep("order");
      return;
    }

    if (step === "payment") {
      if (!paymentFile) return;
      setSubmitting(true);
      try {
        const form = new FormData();
        form.append("personal", JSON.stringify({ ...personal }));
        form.append("proof", paymentFile);
        const url = choice === "rsvp" ? "/api/rsvp" : "/api/order";
        if (choice === "order") {
          form.append("quantities", JSON.stringify({ ...quantities }));
          form.append("chilis", JSON.stringify({ ...chilis }));
          form.append("pickup", pickup);
        }
        const res = await fetch(url, {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setErrorMsg(body?.error || "Something is wrong with your connection. Please try again.");
          return;
        }
        setStep("confirmation");
      } catch (e) {
        setErrorMsg("Could not submit order. Please check your connection.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]!);
  }, [step, personal, choice, quantities, chilis, pickup, paymentFile, validateStep]);

  const goPrev = useCallback(() => {
    setErrorMsg("");
    if (step === "order") {
      setStep("select");
      return;
    }
    if (step === "payment" && choice === "rsvp") {
      setStep("select");
      return;
    }
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]!);
  }, [step, choice]);

  const setQuantity = useCallback((id: string, delta: number) => {
    setQuantities((q) => {
      const newVal = Math.max(0, (q[id] ?? 0) + delta);
      if (newVal > 0 && (q[id] ?? 0) === 0) {
        setActiveChiliModal(id);
      }
      return { ...q, [id]: newVal };
    });
  }, []);

  const addQuantity = useCallback((id: string) => {
  setQuantities((q) => {
    const newQty = (q[id] ?? 0) + 1;

    setChilis(prev => {
      const chiliList = prev[id] ?? [];

      if (chiliList.length < newQty) {
        setActiveChiliModal(id);
      }

      return prev;
    });

    return { ...q, [id]: newQty };
  });
  }, []);

  const removeQuantity = useCallback((id: string) => {
  setQuantities((q) => {
    const current = q[id] ?? 0;
    if (current === 0) return q;

    const newQuantity = current - 1;

    setChilis(prev => {
      const currentChilis = prev[id] ?? [];
      return {
        ...prev,
        [id]: currentChilis.slice(0, newQuantity)
      };
    });

    return { ...q, [id]: newQuantity };
  });
  }, []);

  const handleChiliSelect = (itemId: string, chiliName: string) => {
    setChilis(prev => ({
      ...prev,
      [itemId]: [...prev[itemId], chiliName]
    }));
    setActiveChiliModal(null);
  };

  const orderTotal = ORDERABLE_ITEMS.reduce(
    (sum, item) => sum + (quantities[item.id] ?? 0) * item.price,
    0
  );

  if (step === "landing") {
    return (
      <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
        <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8] px-3 sm:px-5 pb-4 sm:pb-6">
          <div className="flex justify-center -mt-6 -mb-4 overflow-hidden">
            <img src="/hero-group.png" alt="Nibbles and nOOk crew" className="w-[80%] max-w-[290px] h-auto object-contain mt-[-12%]" />
          </div>
          <div className="pb-2 text-center text-[#D44A3D]">
            <p className="font-baby-doll text-lg sm:text-xl leading-none">Welcome to</p>
            <div className="-mt-1 flex justify-center">
              <img src="/logo-nnn.png" alt="Nibbles & nOOk" className="w-[65%] max-w-[260px] h-auto object-contain" />
            </div>
          </div>
          <div className="relative px-1 sm:px-2 pb-2">
            <div className="rounded-3xl bg-[#D44A3D] px-3 sm:px-4 py-3 text-[#fff4dd] mr-[40%] sm:mr-[165px]">
              <h2 className="font-baby-doll text-base sm:text-[20px] leading-none mb-2">For our next event, Nibbles and Nook is doing a pop-up!</h2>
              <ul className="font-baby-doll text-sm sm:text-[18px] leading-[1.15] tracking-tight space-y-[1px]">
                <li>Time: April 11th, 4-9 PM</li>
                <li>Location:  6537 Telford Avenue </li>
              </ul>
            </div>
            <img src="/camera-girl.png" alt="Camera girl decoration" className="absolute right-0 bottom-0 w-[45%] sm:w-[200px] h-auto object-contain" />
          </div>
          <div className="flex justify-center pt-3 pb-1">
            <button
              type="button"
              onClick={() => setStep("personal")}
              className="font-baby-doll px-6 sm:px-8 py-2 rounded-full bg-[#D44A3D] text-[#fff4dd] text-2xl sm:text-[32px] leading-none hover:opacity-95 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (step === "personal") {
    return (
      <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
        <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8] px-4 sm:px-6 pt-5 pb-4">
          <div className="flex justify-center mb-2">
            <img src="/logo-nnn.png" alt="Nibbles & nOOk" className="w-[45%] max-w-[180px] h-auto object-contain" />
          </div>
          <h2 className="font-baby-doll text-[#D44A3D] text-xl sm:text-2xl font-bold text-center mb-5">Fill in your personal info!</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="font-baby-doll text-[#D44A3D] text-lg sm:text-xl font-bold w-[80px] sm:w-[90px] shrink-0">Name:</label>
              <input
                type="text"
                value={personal.name}
                onChange={(e) => { setPersonal((p) => ({ ...p, name: e.target.value })); setErrorMsg(""); }}
                placeholder="Your name"
                className="flex-1 px-4 py-2.5 rounded-full text-white placeholder:text-white/70 focus:outline-none"
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
                className="flex-1 px-4 py-2.5 rounded-full text-white placeholder:text-white/70 focus:outline-none"
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
                className="flex-1 px-4 py-2.5 rounded-full text-white placeholder:text-white/70 focus:outline-none"
                style={{ backgroundColor: RED }}
              />
            </div>
          </div>
          {errorMsg && (
            <p className="font-baby-doll text-[#D44A3D] text-sm bg-[#D44A3D]/10 rounded-xl px-4 py-2 mt-3 text-center">{errorMsg}</p>
          )}
          <div className="flex items-end justify-between mt-2">
            <img src="/guitar-guy.png" alt="Guitar guy" className="w-[40%] max-w-[160px] h-auto object-contain" />
            <div className="flex gap-2 pb-2">
              <button type="button" onClick={goPrev} className="font-baby-doll px-5 py-1.5 rounded-full border-2 text-[#D44A3D] text-lg" style={{ borderColor: RED }}>Back</button>
              <button type="button" onClick={goNext} className="font-baby-doll px-5 py-1.5 rounded-full bg-[#D44A3D] text-[#fff4dd] text-lg">Next</button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (step === "select") {
    return (
      <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
        <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8] px-4 sm:px-6 pt-5 pb-4">
          <div className="flex justify-center mb-2">
            <img src="/logo-nnn.png" alt="Nibbles & nOOk" className="w-[45%] max-w-[180px] h-auto object-contain" />
          </div>
          <h2 className="font-baby-doll text-[#D44A3D] text-xl sm:text-2xl font-bold text-center mb-5 leading-tight">
            Which option do you prefer, {personal.name || "there"}?
          </h2>
          
          <div className="flex flex-col gap-3 px-2">
            <button
              type="button"
              onClick={() => { setChoice("rsvp"); setErrorMsg(""); }}
              className={`font-baby-doll px-4 py-3 rounded-full border-2 text-lg transition-all text-center leading-tight ${
                choice === "rsvp" 
                  ? "bg-[#D44A3D] text-[#fff4dd]" 
                  : "bg-transparent text-[#D44A3D] opacity-60 hover:opacity-100"
              }`}
              style={{ borderColor: RED }}
            >
              RSVP for the event!
            </button>
            <button
              type="button"
              onClick={() => { setChoice("order"); setErrorMsg(""); }}
              className={`font-baby-doll px-4 py-3 rounded-full border-2 text-lg transition-all text-center leading-tight ${
                choice === "order" 
                  ? "bg-[#D44A3D] text-[#fff4dd]" 
                  : "bg-transparent text-[#D44A3D] opacity-60 hover:opacity-100"
              }`}
              style={{ borderColor: RED }}
            >
              Order food & RSVP for the event!
            </button>
          </div>
          
          {errorMsg && (
            <p className="font-baby-doll text-[#D44A3D] text-sm bg-[#D44A3D]/10 rounded-xl px-4 py-2 mt-3 text-center">
              {errorMsg}
            </p>
          )}

          <div className="relative mt-3">
            <img src="/rabbit-waiter.png" alt="Waiter" className="w-[40%] max-w-[160px] h-auto object-contain" />
            <div className="absolute bottom-2 right-0 flex gap-2">
              <button 
                type="button" 
                onClick={goPrev} 
                className="font-baby-doll px-5 py-1.5 rounded-full border-2 text-[#D44A3D] text-lg hover:bg-[#D44A3D]/10" 
                style={{ borderColor: RED }}
              >
                Back
              </button>
              <button 
                type="button" 
                onClick={goNext} 
                className="font-baby-doll px-5 py-1.5 rounded-full bg-[#D44A3D] text-[#fff4dd] text-lg hover:opacity-95 transition-opacity"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (step === "order") {
    return (
      <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
        <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg border border-[#e8dcc8] px-4 sm:px-6 pt-5 pb-4">
          <div className="flex justify-center mb-2">
            <img src="/logo-nnn.png" alt="Logo" className="w-[45%] max-w-[180px]" />
          </div>
          <h2 className="font-baby-doll text-[#D44A3D] text-xl sm:text-2xl font-bold text-center mb-5">Tell us your order, {personal.name || "there"}!</h2>
          <div className="space-y-4">
            {ORDERABLE_ITEMS.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="font-baby-doll text-[#D44A3D] text-lg sm:text-xl font-bold leading-tight">{item.name}:</p>
                  <p className="font-baby-doll text-[#D44A3D] text-base sm:text-lg">(${item.price})</p>
                  {getChiliDisplayString(item.id) && (
                    <p className="font-baby-doll text-[#D44A3D] text-sm italic mt-1 bg-[#D44A3D]/5 inline-block px-2 rounded">
                      Chili: {getChiliDisplayString(item.id)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => removeQuantity(item.id)} className="w-9 h-9 rounded-xl bg-[#D44A3D] text-white font-bold">−</button>
                  <span className="w-10 h-9 rounded-xl bg-[#D44A3D] text-white font-bold flex items-center justify-center">{quantities[item.id] ?? 0}</span>
                  <button onClick={() => addQuantity(item.id)} className="w-9 h-9 rounded-xl bg-[#D44A3D] text-white font-bold">+</button>
                </div>
              </div>
            ))}
          </div>
          <p className="font-baby-doll text-[#D44A3D] text-xl sm:text-2xl font-bold text-right mt-4">Total: ${orderTotal}</p>
          {errorMsg && <p className="font-baby-doll text-[#D44A3D] text-sm bg-[#D44A3D]/10 rounded-xl px-4 py-2 mt-3 text-center">{errorMsg}</p>}
          <div className="relative mt-3">
            <img src="/rabbit-waiter.png" alt="Waiter" className="w-[40%] max-w-[160px]" />
            <div className="absolute bottom-2 right-0 flex gap-2">
              <button onClick={goPrev} className="font-baby-doll px-5 py-1.5 rounded-full border-2 text-[#D44A3D]" style={{ borderColor: RED }}>Back</button>
              <button onClick={goNext} className="font-baby-doll px-5 py-1.5 rounded-full bg-[#D44A3D] text-[#fff4dd]">Next</button>
            </div>
          </div>
        </div>

        {activeChiliModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-sm bg-[var(--cream)] rounded-3xl p-6 border-2 shadow-2xl" style={{ borderColor: RED }}>
              <h3 className="font-baby-doll text-[#D44A3D] text-xl font-bold mb-4 text-center">
                Pick a chili for portion #{(chilis[activeChiliModal]?.length || 0) + 1} of {ORDERABLE_ITEMS.find(i => i.id === activeChiliModal)?.name}!
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {CHILI_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleChiliSelect(activeChiliModal, opt)}
                    className="w-full py-3 rounded-2xl bg-[#D44A3D] text-white font-baby-doll text-lg hover:opacity-90"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // if (step === "pickup") {
  //   return (
  //     <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
  //       <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8] px-4 sm:px-6 pt-5 pb-4">
  //         <div className="flex justify-center mb-2">
  //           <img src="/logo-nnn.png" alt="Nibbles & nOOk" className="w-[45%] max-w-[180px] h-auto object-contain" />
  //         </div>
  //         <h2 className="font-baby-doll text-[#D44A3D] text-xl sm:text-2xl font-bold text-center mb-5">Where do you want to pick up?</h2>
  //         <div className="space-y-3">
  //           {PICKUP_OPTIONS.map((opt) => (
  //             <button
  //               key={opt.id}
  //               type="button"
  //               onClick={() => { setPickup(opt.id); setErrorMsg(""); }}
  //               className={`w-full px-4 py-4 rounded-2xl text-left font-baby-doll text-lg sm:text-xl transition-all ${pickup === opt.id ? "bg-[#D44A3D] text-[#fff4dd]" : "bg-[#D44A3D]/10 text-[#D44A3D]"}`}
  //             >
  //               <span>{opt.label}</span>
  //               <span className="block text-sm sm:text-base mt-1 opacity-80">Pick-up time: {opt.time}</span>
  //             </button>
  //           ))}
  //         </div>
  //         {errorMsg && <p className="font-baby-doll text-[#D44A3D] text-sm bg-[#D44A3D]/10 rounded-xl px-4 py-2 mt-3 text-center">{errorMsg}</p>}
  //         <div className="flex justify-end gap-2 mt-5">
  //           <button type="button" onClick={goPrev} className="font-baby-doll px-5 py-1.5 rounded-full border-2 text-[#D44A3D] text-lg" style={{ borderColor: RED }}>Back</button>
  //           <button type="button" onClick={goNext} className="font-baby-doll px-5 py-1.5 rounded-full bg-[#D44A3D] text-[#fff4dd] text-lg">Next</button>
  //         </div>
  //       </div>
  //     </main>
  //   );
  // }

  if (step === "payment") {
    return (
      <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
        <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8] px-4 sm:px-6 pt-5 pb-4">
          <div className="flex justify-center mb-2">
            <img src="/logo-nnn.png" alt="Nibbles & nOOk" className="w-[45%] max-w-[180px] h-auto object-contain" />
          </div>
          <h2 className="font-baby-doll text-[#D44A3D] text-xl sm:text-2xl font-bold text-center mb-5">
            Please attach proof of payment here! For etransfers, please send to nathan.tedjo@gmail.com
          </h2>
          {choice === "order" && (
            <p className="font-baby-doll text-[#D44A3D] text-xl sm:text-2xl font-bold text-center mb-4">
              Total: ${orderTotal}
            </p>
          )}
          {choice === "rsvp" && (
            <div className="mb-4 text-center space-y-2">
              <h3 className="font-baby-doll italic underline text-[#D44A3D] text-base sm:text-lg leading-snug px-1">
                To reserve your spot, there is a small RSVP fee that will counts as credit for the event!
              </h3>
              <p className="font-baby-doll text-[#D44A3D] text-lg">
                RSVP fee: ${DEFAULT_RSVP_PRICE_DOLLARS}
              </p>
            </div>
          )}
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
            {choice === "rsvp" ? (
              <>
                <p className="font-baby-doll text-[#D44A3D] text-base sm:text-lg leading-snug">
                  Don&apos;t forget to mention it&apos;s for RSVP in the e-transfer note. Ex: {"Nathan"} — RSVP (${DEFAULT_RSVP_PRICE_DOLLARS})
                </p>
              </>
            ) : (
              <>
                <p className="font-baby-doll text-[#D44A3D] text-base sm:text-lg leading-snug">
                  Don&apos;t forget to insert note of the food.
                </p>
                <p className="font-baby-doll text-[#D44A3D] text-base sm:text-lg leading-snug">
                  Ex: {"Nathan"} — Nasi Kulit Ayam (1), Nasi Ayam Geprek (2)
                </p>
              </>
            )}
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

  return (
    <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
      <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8] px-4 sm:px-6 pt-5 pb-4 text-center">
        <img src="/logo-nnn.png" alt="Logo" className="block w-[45%] mx-auto mb-2" />
        <h2 className="font-baby-doll text-[#D44A3D] text-2xl font-bold mb-5">
          {choice === "rsvp" ? "Thank you — you're RSVPed!" : "Thank you for your order!"}
        </h2>
        <div className="font-baby-doll text-[#D44A3D] text-base leading-snug px-1">
          <div className="space-y-3">
            <p>
              We&apos;ve sent your receipt to{" "}
              <a href={`mailto:${personal.email}`} className="underline font-semibold break-words">
                {personal.email}
              </a>
              .
            </p>
            <p>It can take up to 5 minutes. Please make sure to check spam or promotions too.</p>
            <p>
              If it doesn&apos;t show up, or if you have any other questions, contact Michael:{" "}
              <a href="tel:+12368775949" className="underline whitespace-nowrap">
                +1 (236) 877-5949
              </a>
            </p>
          </div>
          <p className="pt-2 mt-3 border-t border-[#D44A3D]/25 mb-1 text-lg sm:text-xl">
            <span className="font-bold block mb-0.5">Pop-up Location:</span>
            Place: 6537 Telford Avenue
            <br />
            Time: April 11th, 4–9 PM
          </p>
          <img
            src="/bye-group.png"
            alt="Thanks"
            className="block w-[75%] max-w-[260px] h-auto mx-auto mt-4 sm:mt-5"
          />
        </div>
      </div>
    </main>
  );
}