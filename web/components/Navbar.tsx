"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Fraunces } from "next/font/google";
import { signOutAction, deleteAccountAction } from "@/app/actions";

const serif = Fraunces({ subsets: ["latin"], weight: ["500"] });

type NavUser = { name?: string | null; image?: string | null } | null | undefined;

export default function Navbar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => {
    setOpen(false);
    setConfirmDelete(false);
  };

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // close dropdown whenever the route changes
  useEffect(() => { closeMenu(); }, [pathname]);

  const itemCls =
    "block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-[#9B988F] transition hover:bg-[#242422] hover:text-[#F0EDE6]";

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#141413]/70 backdrop-blur-md">
      <style>{`
        @keyframes ddIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        {/* logo */}
        <Link
          href="/"
          className={`${serif.className} text-lg font-medium tracking-tight text-[#F0EDE6] transition hover:opacity-80`}
        >
          Contextis
        </Link>

        {/* right side */}
        <div className="flex items-center gap-2">
          {/* the only top-level link */}
          <Link
            href="/how-it-works"
            className={`rounded-full px-3.5 py-1.5 text-sm transition ${
              pathname === "/how-it-works"
                ? "bg-[#2C2C2A] text-[#F0EDE6]"
                : "text-[#9B988F] hover:text-[#F0EDE6]"
            }`}
          >
            How it works
          </Link>

          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => { setOpen((o) => !o); setConfirmDelete(false); }}
                className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[#2C2C2A] transition hover:border-[#CC785C] focus:outline-none focus-visible:border-[#CC785C]"
                aria-label="Account menu"
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-medium text-[#9B988F]">
                    {user.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </span>
                )}
              </button>

              {open && (
                <div
                  style={{ animation: "ddIn 0.16s cubic-bezier(0.16, 1, 0.3, 1)" }}
                  className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-[#2C2C2A] bg-[#1C1C1A]/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-md"
                >
                  {user.name && (
                    <div className="px-3 pb-2 pt-1.5">
                      <p className="truncate text-sm font-medium text-[#F0EDE6]">{user.name}</p>
                    </div>
                  )}

                  <Link href="/dashboard" className={itemCls}>Dashboard</Link>
                  <Link href="/leaderboard" className={itemCls}>Leaderboard</Link>

                  <div className="my-1.5 h-px bg-[#2C2C2A]" />

                  <form action={signOutAction}>
                    <button type="submit" className={itemCls}>Sign out</button>
                  </form>

                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-[#D97066] transition hover:bg-[#2A1A14]"
                    >
                      Delete account
                    </button>
                  ) : (
                    <form action={deleteAccountAction}>
                      <button
                        type="submit"
                        className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-[#E5705F] transition hover:bg-[#2A1A14]"
                      >
                        Click again to confirm
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}