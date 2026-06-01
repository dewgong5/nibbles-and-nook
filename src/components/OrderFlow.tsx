"use client";

import { useState, useCallback, useRef } from "react";
import {
  ALL_MENU_ITEMS,
  BAKMI_ITEMS,
  calculateOrderTotalCents,
  formatPrice,
  MAIN_DISH_ITEMS,
  type MenuItemDef,
  PASTRY_ITEMS,
  SAMBAL_ITEMS,
  SATE_ITEMS,
} from "@/lib/orders-schema";

const RED = "#D44A3D";
const RSVP_URL =
  "https://www.eventbrite.com/e/nibbles-and-nook-20-tickets-1990758404979?aff=oddtdtcreator";

type Language = "id" | "en";
type Step = "landing" | "select" | "personal" | "order" | "sate" | "sambal" | "pastries" | "payment" | "confirmation";
type MenuPageGroup = { title?: string; items: MenuItemDef[] };

interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
}

interface OrderQuantities {
  [key: string]: number;
}

const PICKUP_OPTIONS = [
  { id: "sabtu-metrotown", label: "Saturday, 7th March — Metrotown", time: "5:00 – 6:00 PM" },
  { id: "minggu-iec", label: "Sunday, 8th March — Indonesian Evangelical Church", time: "11:30 AM – 12:00 PM" },
] as const;

const STEPS: Step[] = ["landing", "select", "personal", "order", "sate", "sambal", "pastries", "payment", "confirmation"];

export function OrderFlow() {
  const [step, setStep] = useState<Step>("landing");
  const [language, setLanguage] = useState<Language | null>(null);
  const [personal, setPersonal] = useState<PersonalInfo>({
    name: "",
    email: "",
    phone: "",
  });
  const [quantities, setQuantities] = useState<OrderQuantities>(() =>
    ALL_MENU_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {})
  );
  const [pickup, setPickup] = useState("");
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const getItemLabel = (item: MenuItemDef) =>
    language === "en" ? item.translated : item.name;

  const mainDishSectionTitle = language === "en" ? "Main dish" : "Hidangan utama";
  const sateSectionTitle = language === "en" ? "Satay" : "Sate";
  const sambalSectionTitle = language === "en" ? "Extra sambal" : "Sambal tambahan";
  const freeSambalNote =
    language === "en"
      ? "Every rice dish comes with one free sambal."
      : "Setiap hidangan nasi sudah termasuk satu sambal gratis.";
  const extraSambalNote =
    language === "en"
      ? "Add-on jars (110 ml) — separate from the free sambal included with each rice dish."
      : "Sambal tambahan (110 ml) — terpisah dari sambal gratis yang termasuk di setiap hidangan nasi.";
  const pastriesSectionTitle = language === "en" ? "Pastries" : "Pastry";

  const validateStep = useCallback((): string | null => {
    if (step === "personal") {
      if (!personal.name.trim()) return "Please enter your name.";
      if (personal.name.length > 255) return "Name is too long (max 255 characters).";
      if (!personal.email.trim()) return "Please enter your email.";
      if (!EMAIL_REGEX.test(personal.email)) return "Please enter a valid email address.";
      if (!personal.phone.trim()) return "Please enter your phone number.";
    }
    if (step === "payment") {
      const total = Object.values(quantities).reduce((a, b) => a + b, 0);
      if (total <= 0) return "Please add at least one item to your order.";
    }
    // if (step === "pickup") {
    //   if (!pickup) return "Please select a pickup option.";
    // }
    if (step === "payment") {
      if (!paymentFile) return "Please upload your proof of payment.";
      if (paymentFile.size > MAX_FILE_SIZE) return "File is too large (max 10 MB).";
    }
    return null;
  }, [step, personal, quantities, pickup, paymentFile]);

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
        form.append("proof", paymentFile);
        form.append("quantities", JSON.stringify({ ...quantities }));
        form.append("pickup", pickup);
        const res = await fetch("/api/order", {
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
  }, [step, personal, quantities, pickup, paymentFile, validateStep]);

  const goPrev = useCallback(() => {
    setErrorMsg("");
    if (step === "order") {
      setStep("personal");
      return;
    }
    if (step === "sate") {
      setStep("order");
      return;
    }
    if (step === "sambal") {
      setStep("sate");
      return;
    }
    if (step === "pastries") {
      setStep("sambal");
      return;
    }
    if (step === "payment") {
      setStep("pastries");
      return;
    }
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]!);
  }, [step]);

  const addQuantity = useCallback((id: string) => {
    setQuantities((q) => ({ ...q, [id]: (q[id] ?? 0) + 1 }));
  }, []);

  const removeQuantity = useCallback((id: string) => {
    setQuantities((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) - 1) }));
  }, []);

  const orderTotalCents = calculateOrderTotalCents(quantities);

  const renderQuantityMenuPage = (
    itemsOrGroups: MenuItemDef[] | MenuPageGroup[],
    options: {
      sectionTitle?: string;
      sectionNote?: string;
    } = {}
  ) => {
    const groups =
      itemsOrGroups.length > 0 && "items" in itemsOrGroups[0]!
        ? (itemsOrGroups as MenuPageGroup[])
        : [{ items: itemsOrGroups as MenuItemDef[] }];

    return (
    <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
      <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg border border-[#e8dcc8] px-4 sm:px-6 pt-5 pb-4">
        <div className="relative flex justify-center mb-2">
          <img src="/logo-nnn.png" alt="Logo" className="w-[45%] max-w-[180px]" />
          {language && (
            <button
              type="button"
              onClick={() => setLanguage(null)}
              className="absolute right-0 top-0 rounded-full border border-[#D44A3D] px-3 py-1 font-baby-doll text-sm text-[#D44A3D]"
            >
              {language === "en" ? "EN" : "ID"}
            </button>
          )}
        </div>
        <h2 className="font-baby-doll text-[#D44A3D] text-xl sm:text-2xl font-bold text-center mb-5">
          Tell us your order, {personal.name || "there"}!
        </h2>
        {language && options.sectionTitle && (
          <>
            <h3 className="font-baby-doll text-[#D44A3D] text-lg sm:text-xl font-bold mb-2 border-b border-[#D44A3D]/20 pb-2">
              {options.sectionTitle}
            </h3>
            {options.sectionNote && (
              <p className="font-baby-doll text-[#D44A3D] text-sm sm:text-base italic mb-4 bg-[#D44A3D]/5 rounded-xl px-3 py-2 leading-snug">
                {options.sectionNote}
              </p>
            )}
          </>
        )}
        <div className="space-y-5">
          {groups.map((group, groupIndex) => (
            <div key={group.title ?? groupIndex} className="space-y-4">
              {group.title && (
                <h4 className="font-baby-doll text-[#D44A3D] text-base sm:text-lg font-bold">
                  {group.title}
                </h4>
              )}
              {group.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-baby-doll text-[#D44A3D] text-lg sm:text-xl font-bold leading-tight">
                      {language ? `${getItemLabel(item)}:` : item.name}
                    </p>
                    <p className="font-baby-doll text-[#D44A3D] text-base sm:text-lg">
                      ({formatPrice(item.priceCents)}
                      {item.portionNote && language
                        ? ` / ${language === "en" ? item.portionNote.en : item.portionNote.id}`
                        : item.portionNote
                          ? ` / ${item.portionNote.en}`
                          : ""}
                      )
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => removeQuantity(item.id)}
                      className="w-9 h-9 rounded-xl bg-[#D44A3D] text-white font-bold"
                    >
                      −
                    </button>
                    <span className="w-10 h-9 rounded-xl bg-[#D44A3D] text-white font-bold flex items-center justify-center">
                      {quantities[item.id] ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => addQuantity(item.id)}
                      className="w-9 h-9 rounded-xl bg-[#D44A3D] text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="font-baby-doll text-[#D44A3D] text-xl sm:text-2xl font-bold text-right mt-4">
          Total: {formatPrice(orderTotalCents)}
        </p>
        {errorMsg && (
          <p className="font-baby-doll text-[#D44A3D] text-sm bg-[#D44A3D]/10 rounded-xl px-4 py-2 mt-3 text-center">
            {errorMsg}
          </p>
        )}
        <div className="relative mt-3">
          <img src="/rabbit-waiter.png" alt="Waiter" className="w-[40%] max-w-[160px]" />
          <div className="absolute bottom-2 right-0 flex gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="font-baby-doll px-5 py-1.5 rounded-full border-2 text-[#D44A3D]"
              style={{ borderColor: RED }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              className="font-baby-doll px-5 py-1.5 rounded-full bg-[#D44A3D] text-[#fff4dd]"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {!language && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="w-full max-w-xs rounded-3xl bg-[var(--cream)] p-6 text-center shadow-2xl border-2"
            style={{ borderColor: RED }}
          >
            <h3 className="font-baby-doll text-[#D44A3D] text-xl mb-2">Choose your language</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className="rounded-2xl bg-[#D44A3D] px-4 py-3 font-baby-doll text-lg text-[#fff4dd]"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage("id")}
                className="rounded-2xl border-2 px-4 py-3 font-baby-doll text-lg text-[#D44A3D]"
                style={{ borderColor: RED }}
              >
                Indonesian
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
  };

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
              <h2 className="font-baby-doll text-base sm:text-lg leading-none mb-1.5">
                For our next event, Nibbles and Nook 2.0 is doing a pop-up!
              </h2>
              <ul className="font-baby-doll text-sm sm:text-base leading-[1.2] tracking-tight space-y-0.5">
                <li>Time: 27 June, 10 AM - 4 PM</li>
                <li>Location: 1587 Frances St</li>
              </ul>
            </div>
            <img src="/camera-girl.png" alt="Camera girl decoration" className="absolute right-0 bottom-0 w-[45%] sm:w-[200px] h-auto object-contain" />
          </div>
          <div className="flex justify-center pt-3 pb-1">
            <button
              type="button"
              onClick={() => setStep("select")}
              className="font-baby-doll px-6 sm:px-8 py-2 rounded-full bg-[#D44A3D] text-[#fff4dd] text-2xl sm:text-[32px] leading-none hover:opacity-95 transition-opacity"
            >
              Next
            </button>
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
            What would you like to do?
          </h2>

          <div className="flex flex-col gap-3 px-2">
            <a
              href={RSVP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-baby-doll px-4 py-3 rounded-full border-2 text-lg transition-all text-center leading-tight bg-[#D44A3D] text-[#fff4dd]"
              style={{ borderColor: RED }}
            >
              RSVP
            </a>
            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                setStep("personal");
              }}
              className="font-baby-doll px-4 py-3 rounded-full border-2 text-lg transition-all text-center leading-tight text-[#D44A3D] hover:bg-[#D44A3D]/10"
              style={{ borderColor: RED }}
            >
              Preorder
            </button>
          </div>

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
            </div>
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

  if (step === "order") {
    return renderQuantityMenuPage([
      { title: language === "en" ? "Grilled Rice" : "Nasi Bakar", items: MAIN_DISH_ITEMS },
      { title: "Bakmi", items: BAKMI_ITEMS },
    ], {
      sectionTitle: language ? mainDishSectionTitle : undefined,
      sectionNote: language ? freeSambalNote : undefined,
    });
  }

  if (step === "sate") {
    return renderQuantityMenuPage(SATE_ITEMS, {
      sectionTitle: language ? sateSectionTitle : undefined,
    });
  }

  if (step === "sambal") {
    return renderQuantityMenuPage(SAMBAL_ITEMS, {
      sectionTitle: language ? sambalSectionTitle : undefined,
      sectionNote: language ? extraSambalNote : undefined,
    });
  }

  if (step === "pastries") {
    return renderQuantityMenuPage(PASTRY_ITEMS, {
      sectionTitle: language ? pastriesSectionTitle : undefined,
    });
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
            Please attach proof of payment here! For etransfers, send to joachimkenneth@wealthsimple.me
          </h2>
          <p className="font-baby-doll text-[#D44A3D] text-xl sm:text-2xl font-bold text-center mb-4">
            Total: {formatPrice(orderTotalCents)}
          </p>
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
              Ex: {"Nathan"} — Nasi Bakar Ayam Kemangi (1), Bakmi (1)
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

  return (
    <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
      <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8] px-4 sm:px-6 pt-5 pb-4 text-center">
        <img src="/logo-nnn.png" alt="Logo" className="block w-[45%] mx-auto mb-2" />
        <h2 className="font-baby-doll text-[#D44A3D] text-2xl font-bold mb-5">
          Thank you for your order!
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
          <div className="pt-2 mt-3 border-t border-[#D44A3D]/25 mb-1">
            <p>
              <span className="font-bold block mb-0.5">Pop-up Location:</span>
              Place: 1587 Frances St
              <br />
              Time: 27 June, 10 AM - 4 PM
            </p>
          </div>
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
