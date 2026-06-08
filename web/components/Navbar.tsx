
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Fraunces } from "next/font/google";
import { signOutAction } from "@/app/actions";

const serif = Fraunces({ subsets: ["latin"], weight: ["500"] });

type NavUser = { name?: string | null; image?: string | null } | null | undefined;

export default function Navbar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // close dropdown whenever the route changes
  useEffect(() => { setOpen(false); }, [pathname]);

  const links = [
    { href: "/dashboard",    label: "Dashboard",    authOnly: true  },
    { href: "/leaderboard",  label: "Leaderboard",  authOnly: false },
    { href: "/how-it-works", label: "How it works", authOnly: false },
  ].filter((l) => !l.authOnly || user);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#141413]/70 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        {/* logo */}
        <Link
          href="/"
          className={`${serif.className} text-lg font-medium tracking-tight text-[#F0EDE6] transition hover:opacity-80`}
        >
          Contextis
        </Link>

        {/* right side */}
        <div className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  active
                    ? "bg-[#2C2C2A] text-[#F0EDE6]"
                    : "text-[#9B988F] hover:text-[#F0EDE6]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {user ? (
            <div className="relative ml-2" ref={menuRef}>
              <button
                onClick={() => setOpen((o) => !o)}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#2C2C2A] transition hover:border-[#CC785C] focus:outline-none focus-visible:border-[#CC785C]"
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
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-[#2C2C2A] bg-[#1C1C1A] py-1 shadow-xl shadow-black/40">
                  {user.name && (
                    <div className="border-b border-[#2C2C2A] px-4 py-2.5">
                      <p className="truncate text-sm font-medium text-[#F0EDE6]">{user.name}</p>
                    </div>
                  )}
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-[#9B988F] transition hover:bg-[#242422] hover:text-[#F0EDE6]"
                  >
                    Dashboard
                  </Link>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="block w-full px-4 py-2 text-left text-sm text-[#9B988F] transition hover:bg-[#242422] hover:text-[#F0EDE6]"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/"
              className="ml-2 rounded-full bg-[#F0EDE6] px-4 py-1.5 text-sm font-medium text-[#141413] transition hover:bg-[#E4E1DA]"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}