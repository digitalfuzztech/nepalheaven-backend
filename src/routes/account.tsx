import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Heart,
  LogOut,
  Map,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { getMyBookingsFn } from "@/lib/booking.functions";
import { getPackagesFn } from "@/lib/content.functions";
import { countryName } from "@/lib/countries";
import {
  getMyProfilePhotoFn,
  removeMyProfilePhotoFn,
  uploadMyProfilePhotoFn,
} from "@/lib/profile.functions";

export const Route = createFileRoute("/account")({
  loader: async () => {
    const [packages, bookingResult, photoResult] = await Promise.all([
      getPackagesFn(),
      getMyBookingsFn(),
      getMyProfilePhotoFn(),
    ]);
    return { packages, bookingResult, photoResult };
  },
  component: AccountPage,
});

type Booking = Extract<
  Awaited<ReturnType<typeof getMyBookingsFn>>,
  { ok: true }
>["bookings"][number];

function AccountPage() {
  const { packages, bookingResult, photoResult } = Route.useLoaderData();
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (ready && (!user || user.role !== "customer"))
      void navigate({ to: "/login", replace: true });
    try {
      setSaved(
        JSON.parse(
          window.localStorage.getItem("nepalheaven_saved_v1") || "[]",
        ) as string[],
      );
    } catch {
      setSaved([]);
    }
  }, [ready, user, navigate]);

  if (!ready || !user || user.role !== "customer")
    return <div className="min-h-[70vh]" />;

  const savedPackages = packages.filter((pkg) => saved.includes(pkg.slug));
  const profilePhoto = photoResult.ok ? photoResult.photo.dataUrl : null;
  const nationality = countryName(user.nationality) || "Not added";

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("photo") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return setPhotoError("Choose a JPEG, PNG or WEBP photo.");
    const data = new FormData();
    data.set("photo", file);
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const result = await uploadMyProfilePhotoFn({ data });
      if (!result.ok) return setPhotoError(result.message);
      window.location.reload();
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const result = await removeMyProfilePhotoFn();
      if (!result.ok) return setPhotoError(result.message);
      window.location.reload();
    } finally {
      setPhotoBusy(false);
    }
  }
  const customerBookings = bookingResult.ok ? bookingResult.bookings : [];
  const today = new Date().toISOString().slice(0, 10);
  const cancelled = customerBookings.filter(
    (booking) => booking.status === "cancelled",
  );
  const past = customerBookings.filter(
    (booking) =>
      booking.status !== "cancelled" &&
      (booking.status === "completed" ||
        (booking.departureDate && booking.departureDate < today)),
  );
  const upcoming = customerBookings.filter(
    (booking) =>
      booking.status !== "cancelled" &&
      booking.status !== "completed" &&
      (!booking.departureDate || booking.departureDate >= today),
  );

  const summaries: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
  }> = [
    {
      label: "Upcoming trips",
      value: String(upcoming.length),
      icon: CalendarDays,
    },
    { label: "Saved trips", value: String(savedPackages.length), icon: Heart },
    { label: "Account status", value: "Active", icon: ShieldCheck },
  ];

  return (
    <section className="container-lux py-16 lg:py-24">
      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className="h-fit rounded-3xl border border-border bg-card p-3">
          <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={`${user.name}'s profile`}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-sm font-bold">
                {initials(user.name)}
              </div>
            )}
            <p className="mt-4 text-sm font-semibold">{user.name}</p>
            <p className="mt-1 break-all text-xs text-primary-foreground/60">
              {user.email}
            </p>
          </div>
          <nav className="mt-3 grid gap-1">
            <a
              href="#overview"
              className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold"
            >
              Overview
            </a>
            <a
              href="#bookings"
              className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-accent"
            >
              My bookings
            </a>
            <a
              href="#saved"
              className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-accent"
            >
              Saved trips
            </a>
            <a
              href="#profile"
              className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-accent"
            >
              Profile
            </a>
            <button
              onClick={async () => {
                await logout();
                void navigate({ to: "/login", replace: true });
              }}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </nav>
        </aside>

        <div className="space-y-8">
          <div
            id="overview"
            className="rounded-[2rem] bg-summit p-8 text-primary-foreground lg:p-10"
          >
            <p className="eyebrow">Traveller dashboard</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold">
              Welcome, {user.name.split(" ")[0]}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-primary-foreground/70">
              Review your bookings, explore journeys and keep your favourite
              trips close at hand.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/packages"
                className="bg-gold-gradient rounded-full px-5 py-3 text-sm font-bold text-gold-foreground"
              >
                Explore packages
              </Link>
              <Link
                to="/compare"
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold"
              >
                Compare trips
              </Link>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {summaries.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-3xl border border-border bg-card p-6"
              >
                <Icon className="h-5 w-5 text-gold" />
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <section
            id="bookings"
            className="rounded-3xl border border-border bg-card p-7"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow text-gold">Your journeys</p>
                <h2 className="mt-2 text-2xl">My bookings</h2>
              </div>
              <Link
                to="/packages"
                className="text-sm font-bold text-primary hover:text-gold"
              >
                Explore trips
              </Link>
            </div>

            {!bookingResult.ok ? (
              <div className="mt-6 rounded-2xl bg-destructive/5 p-6 text-sm text-destructive">
                We couldn't load your bookings right now. Please refresh and try
                again.
              </div>
            ) : customerBookings.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-accent p-6">
                <p className="font-semibold">
                  You don't have any bookings yet.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Explore Nepal Heaven journeys when you're ready to plan your
                  next adventure.
                </p>
                <Link
                  to="/packages"
                  className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
                >
                  Explore trips
                </Link>
              </div>
            ) : (
              <div className="mt-6 space-y-7">
                <BookingGroup title="Upcoming" bookings={upcoming} />
                <BookingGroup title="Past" bookings={past} />
                <BookingGroup title="Cancelled" bookings={cancelled} />
              </div>
            )}
          </section>

          <div
            id="saved"
            className="rounded-3xl border border-border bg-card p-7"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow text-gold">Your favourites</p>
                <h2 className="mt-2 text-2xl">Saved trips</h2>
              </div>
              <Link
                to="/packages"
                className="text-sm font-bold text-primary hover:text-gold"
              >
                Find more
              </Link>
            </div>
            {savedPackages.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {savedPackages.map((pkg) => (
                  <Link
                    key={pkg.slug}
                    to="/packages/$slug"
                    params={{ slug: pkg.slug }}
                    className="group flex gap-4 rounded-2xl border border-border p-3 hover:border-gold"
                  >
                    <img
                      src={pkg.image}
                      alt=""
                      className="h-24 w-28 rounded-xl object-cover"
                    />
                    <span className="py-1">
                      <strong className="block group-hover:text-gold">
                        {pkg.title}
                      </strong>
                      <small className="mt-1 block text-muted-foreground">
                        {pkg.days} days · From ${pkg.price.toLocaleString()}
                      </small>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl bg-accent p-6 text-sm text-muted-foreground">
                You haven't saved any trips yet. Tap the heart on a package to
                keep it here.
              </div>
            )}
          </div>

          <div
            id="profile"
            className="rounded-3xl border border-border bg-card p-7"
          >
            <p className="eyebrow text-gold">Your details</p>
            <h2 className="mt-2 text-2xl">Profile</h2>
            <div className="mt-6 grid gap-6 lg:grid-cols-[13rem_1fr]">
              <div className="rounded-2xl bg-accent p-5 text-center">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={`${user.name}'s profile`}
                    className="mx-auto h-28 w-28 rounded-full object-cover"
                  />
                ) : (
                  <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-card text-2xl font-bold text-primary">
                    {initials(user.name)}
                  </div>
                )}
                <form onSubmit={uploadPhoto} className="mt-4">
                  <label className="inline-flex cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                    {profilePhoto ? "Upload New Photo" : "Upload Photo"}
                    <input
                      name="photo"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) =>
                        event.currentTarget.form?.requestSubmit()
                      }
                      disabled={photoBusy}
                    />
                  </label>
                </form>
                {profilePhoto ? (
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={() => void removePhoto()}
                    className="mt-3 text-xs font-semibold text-destructive disabled:opacity-60"
                  >
                    Remove photo
                  </button>
                ) : null}
                <p className="mt-3 text-xs text-muted-foreground">
                  JPEG, PNG or WEBP · maximum 5 MB
                </p>
                {photoError ? (
                  <p role="alert" className="mt-2 text-xs text-destructive">
                    {photoError}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Info label="Full name" value={user.name} />
                <Info label="Email" value={user.email} />
                <Info label="Phone" value={user.phone || "Not added"} />
                <Info label="Nationality" value={nationality} />
                <Info
                  label="Date of birth"
                  value={user.dateOfBirth || "Not added"}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "NH"
  );
}

function BookingGroup({
  title,
  bookings,
}: {
  title: string;
  bookings: Booking[];
}) {
  if (!bookings.length) return null;
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h3>
      <div className="mt-3 grid gap-4">
        {bookings.map((booking) => (
          <article
            key={booking.reference}
            className="grid gap-5 rounded-2xl border border-border p-4 sm:grid-cols-[8rem_1fr_auto] sm:items-center"
          >
            {booking.packageImage ? (
              <img
                src={booking.packageImage}
                alt=""
                className="h-24 w-full rounded-xl object-cover sm:w-32"
              />
            ) : (
              <div className="grid h-24 place-items-center rounded-xl bg-accent text-gold">
                <Map className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold">{booking.packageTitle}</h4>
                <StatusPill status={booking.status} />
              </div>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {booking.reference}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span>
                  <CalendarDays className="mr-1.5 inline h-4 w-4 text-gold" />
                  {formatDate(booking.departureDate)}
                </span>
                <span>
                  <Users className="mr-1.5 inline h-4 w-4 text-gold" />
                  {booking.travellers}{" "}
                  {booking.travellers === 1 ? "traveller" : "travellers"}
                </span>
                <span>{booking.tierName || "Standard"}</span>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="font-semibold">
                {formatMoney(booking.total, booking.currency)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {booking.status === "cancelled"
                  ? refundLabel(booking.refundStatus)
                  : paymentLabel(booking.paymentStatus)}
              </p>
              {booking.status === "cancelled" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Paid {formatMoney(booking.amountPaid, booking.currency)} · Fee{" "}
                  {formatMoney(booking.cancellationFeeAmount, booking.currency)}{" "}
                  ·{" "}
                  {booking.refundedAmount > 0
                    ? `Refunded ${formatMoney(booking.refundedAmount, booking.currency)}`
                    : `Refund amount ${formatMoney(booking.refundAmount, booking.currency)}`}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Paid {formatMoney(booking.amountPaid, booking.currency)} ·
                  Remaining{" "}
                  {formatMoney(booking.remainingBalance, booking.currency)}
                </p>
              )}
              {booking.cancelledDate ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Cancelled {formatDate(booking.cancelledDate.slice(0, 10))}
                </p>
              ) : null}
              <Link
                to="/account/bookings/$reference"
                params={{ reference: booking.reference }}
                className="mt-3 inline-flex rounded-full border border-border px-4 py-2 text-xs font-bold hover:border-gold hover:text-gold"
              >
                View booking
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Booking["status"] }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className="rounded-full bg-accent px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-accent-foreground">
      {label}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-accent p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "To be arranged";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

function paymentLabel(status: Booking["paymentStatus"]) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function refundLabel(status: Booking["refundStatus"]) {
  return {
    none: "None",
    processed_for_refund: "Processed for Refund",
    partially_refunded: "Partially Refunded",
    refunded: "Refunded",
    refund_failed: "Refund Failed",
    no_refund_due: "No Refund Due",
  }[status];
}
