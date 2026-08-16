import type { ReactNode } from "react";
import heroEverest from "@/assets/hero-everest.jpg";
import { Link } from "@tanstack/react-router";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  admin = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  admin?: boolean;
}) {
  return (
    <div className="relative flex min-h-screen items-center overflow-hidden bg-primary px-4 pb-10 pt-28">
      <img
        src={heroEverest}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-25"
      />
      <div className="absolute inset-0 bg-primary/90" />
      <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-background shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden min-h-[680px] flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
          <div>
            <Link
              to="/"
              className="font-[family-name:var(--font-display)] text-2xl font-semibold"
            >
              Nepal Heaven
            </Link>
            <p className="mt-2 text-sm text-primary-foreground/60">
              {admin
                ? "Nepal Heaven Administration"
                : "Heaven on Earth Awaits."}
            </p>
          </div>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-5 max-w-lg font-[family-name:var(--font-display)] text-5xl font-semibold leading-tight">
              {title}
            </h1>
            <p className="mt-5 max-w-md leading-relaxed text-primary-foreground/70">
              {description}
            </p>
          </div>
          <p className="text-xs text-primary-foreground/45">
            © {new Date().getFullYear()} Nepal Heaven
          </p>
        </div>
        <div className="flex min-h-[680px] items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Link
                to="/"
                className="font-[family-name:var(--font-display)] text-2xl font-semibold text-primary"
              >
                Nepal Heaven
              </Link>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
