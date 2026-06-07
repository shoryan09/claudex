"use client";
import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";

export default function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleDelete() {
    setLoading(true);
    await fetch("/api/account", { method: "DELETE" });
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setConfirming(false); }}
        className="flex cursor-pointer items-center gap-1.5 text-sm text-[#6B6862] transition hover:text-[#141413]"
      >
        {name}
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-52 rounded-2xl border border-[#ECEAE2] bg-white p-1.5 shadow-[0_8px_32px_-8px_rgba(20,20,19,0.18)]">
          {!confirming ? (
            <>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full cursor-pointer rounded-xl px-3 py-2.5 text-left text-sm text-[#141413] transition hover:bg-[#F5F3EE]"
              >
                Sign out
              </button>
              <button
                onClick={() => setConfirming(true)}
                className="w-full cursor-pointer rounded-xl px-3 py-2.5 text-left text-sm text-red-500 transition hover:bg-red-50"
              >
                Delete account
              </button>
            </>
          ) : (
            <div className="p-2">
              <p className="text-[13px] leading-relaxed text-[#6B6862]">
                This permanently deletes your account and all your usage data. Cannot be undone.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 cursor-pointer rounded-xl border border-[#ECEAE2] py-2 text-xs text-[#6B6862] transition hover:bg-[#F5F3EE]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 cursor-pointer rounded-xl bg-red-500 py-2 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-60"
                >
                  {loading ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}