import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/lib/auth";
import { ComparisonProvider, useComparison } from "@/lib/comparison";
import { Footer } from "@/components/Footer";
import { getShellContentFn } from "@/lib/content.functions";
import heroEverest from "@/assets/hero-everest.jpg";

function isMinimalShellPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isCustomerAuthPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/registration" ||
    pathname === "/verify-email" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  );
}

function NotFoundComponent() {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4">
      <img
        src={heroEverest}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-primary/75" />
      <div className="glass-dark relative max-w-lg rounded-[2rem] p-10 text-center text-primary-foreground">
        <p className="eyebrow">Off the trail</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-7xl font-semibold">
          404
        </h1>
        <h2 className="mt-4 text-xl font-semibold">This path leads nowhere</h2>
        <p className="mt-3 text-sm text-primary-foreground/75">
          Even the best sherpas take a wrong turn. Let's get you back to base
          camp.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="bg-gold-gradient inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-gold-foreground transition-transform hover:scale-105"
          >
            Return home
          </Link>
          <Link
            to="/packages"
            className="inline-flex items-center justify-center rounded-full border border-primary-foreground/30 px-6 py-3 text-sm font-semibold transition-colors hover:border-gold hover:text-gold"
          >
            Browse journeys
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back
          home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    loader: ({ location }) =>
      isMinimalShellPath(location.pathname) ? null : getShellContentFn(),
    head: ({ loaderData }) => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "Nepal Heaven — Luxury Himalayan Travel & Trekking" },
        {
          name: "description",
          content:
            "Private, expertly crafted journeys across Nepal — Everest, Annapurna, Mustang and beyond. Heaven on Earth Awaits.",
        },
        { name: "author", content: "Nepal Heaven" },
        { property: "og:site_name", content: "Nepal Heaven" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "theme-color", content: "#123B66" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap",
        },
        { rel: "icon", href: "/favicon.png", type: "image/x-icon" },
      ],
      scripts: loaderData
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "TravelAgency",
                name: loaderData.company.name,
                slogan: loaderData.company.tagline,
                url: "https://nepalheaven.com",
                telephone: loaderData.company.phone,
                email: loaderData.company.email,
                address: loaderData.company.address,
              }),
            },
          ]
        : [],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const shellContent = Route.useLoaderData();
  const location = useLocation();
  const pathname = location.pathname;
  const minimalShell = isMinimalShellPath(pathname);
  const customerAuthPath = isCustomerAuthPath(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ComparisonProvider>
          {!minimalShell && shellContent ? (
            <Navbar company={shellContent.company} />
          ) : null}
          <main>
            <Outlet />
          </main>
          {!minimalShell && !customerAuthPath ? <ComparisonBar /> : null}
          {!minimalShell && !customerAuthPath && shellContent ? (
            <Footer {...shellContent} />
          ) : null}
        </ComparisonProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function ComparisonBar() {
  const { items, clear } = useComparison();
  if (!items.length) return null;
  return (
    <div className="fixed inset-x-3 bottom-4 z-40 mx-auto max-w-2xl rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl sm:inset-x-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            {items.length} of 3 trips selected
          </p>
          <p className="text-xs text-muted-foreground">
            Compare packages side by side before booking.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/compare"
            className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
          >
            Compare
          </Link>
          <button
            onClick={clear}
            className="hidden rounded-xl border border-border px-3 py-2.5 text-xs font-semibold sm:block"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
