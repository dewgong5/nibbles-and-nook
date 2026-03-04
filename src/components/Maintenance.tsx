"use client";

const RED = "#D44A3D";

export function Maintenance() {
  return (
    <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8">
      <div className="w-full max-w-md bg-[var(--cream)] rounded-2xl shadow-lg overflow-hidden border border-[#e8dcc8] px-3 sm:px-5 pb-4 sm:pb-6">
        <div className="flex justify-center mt-12 -mb-4 overflow-hidden">
          <img
            src="/maintenance-nnn.png"
            alt="Nibbles and nOOk crew"
            className="w-[80%] max-w-[290px] h-auto object-contain mt-[-6%]"
          />
        </div>
        <div className="pb-2 text-center text-[#D44A3D]">
          <div className="-mt-1 flex justify-center">
            <img
              src="/logo-nnn.png"
              alt="Nibbles & nOOk"
              className="w-[65%] max-w-[260px] h-auto object-contain"
            />
          </div>
          <p className="font-baby-doll text-lg sm:text-xl leading-none">will be back soon!</p>
        </div>
        <div className="relative px-4 pb-2">
          <div className="mx-auto max-w-[230px] rounded-3xl bg-[#D44A3D] px-5 py-3 text-[#fff4dd] text-center">
            <p className="font-baby-doll text-sm sm:text-[16px] leading-tight tracking-tight">
              Check out our instagram @nibblesandnook in the meantime and for future pre orders!
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}