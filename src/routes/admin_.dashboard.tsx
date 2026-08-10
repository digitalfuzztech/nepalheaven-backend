import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, BookOpen, Inbox, LayoutDashboard, LogOut, Settings, Users, WalletCards } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin_/dashboard")({ component: Admin_Dashboard });

function Admin_Dashboard() {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && (!user || user.role !== "admin")) void navigate({ to: "/admin", replace: true });
  }, [ready, user, navigate]);

  if (!ready || !user || user.role !== "admin") return <div className="min-h-screen bg-[#0c1724]" />;

  async function signOut() {
    await logout();
    window.location.assign("/admin");
  }

  return (
    <div className="min-h-screen bg-[#f6f5f1]">
      <header className="border-b border-black/10 bg-[#0c1724] text-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/admin/dashboard" className="font-[family-name:var(--font-display)] text-2xl font-semibold">Nepal Heaven <span className="text-gold">Admin</span></Link>
          <div className="flex items-center gap-4"><span className="hidden text-sm text-white/60 sm:block">{user.email}</span><button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10"><LogOut className="h-4 w-4" /> Sign out</button></div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1500px]">
        <aside className="hidden min-h-[calc(100vh-73px)] w-64 shrink-0 border-r border-black/10 bg-white p-5 lg:block">
          <p className="px-3 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
          <nav className="mt-3 grid gap-1">
            <a href="#overview" className="flex items-center gap-3 rounded-xl bg-[#0c1724] px-4 py-3 text-sm font-semibold text-white"><LayoutDashboard className="h-4 w-4" /> Dashboard</a>
            <a href="#cms" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-black/5"><BookOpen className="h-4 w-4" /> CMS</a>
            <a href="#crm" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-black/5"><Users className="h-4 w-4" /> CRM</a>
            <a href="#reports" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-black/5"><BarChart3 className="h-4 w-4" /> Reports</a>
            <a href="#settings" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-black/5"><Settings className="h-4 w-4" /> Settings</a>
          </nav>
        </aside>
        <main id="overview" className="min-w-0 flex-1 p-5 lg:p-8">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Administration</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold text-[#0c1724]">Good morning, Admin.</h1><p className="mt-2 text-sm text-muted-foreground">Phase 2 authentication workspace. CMS, CRM, messaging and payment data will connect in the upcoming backend phases.</p></div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[['Bookings', '0', WalletCards], ['Customers', '0', Users], ['New leads', '0', Inbox], ['Published content', '0', BookOpen]].map(([label, value, Icon]) => <div key={String(label)} className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm"><Icon className="h-5 w-5 text-gold" /><p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold text-[#0c1724]">{value}</p></div>)}
          </div>
          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <Module id="cms" title="Content Management System" description="Manage packages, destinations, pages, blogs, gallery media, FAQs, testimonials and SEO metadata from one structured CMS." items={['Packages', 'Destinations', 'Website pages', 'Blog & articles', 'Gallery & media', 'SEO']} />
            <Module id="crm" title="Customer Relationship Management" description="Manage customers, leads, bookings, payments and conversations from the Nepal Heaven CRM." items={['Customers', 'Leads & enquiries', 'Bookings', 'Payments', 'Email inbox', 'WhatsApp']} />
          </div>
          <div id="reports" className="mt-8 rounded-2xl border border-black/10 bg-white p-7"><h2 className="text-xl font-semibold">Phase roadmap</h2><div className="mt-5 grid gap-3 md:grid-cols-4">{['Phase 1 · Customer frontend', 'Phase 2 · PostgreSQL & authentication', 'Phase 3 · Email & WhatsApp', 'Phase 4 · CMS & CRM'].map((x, i) => <div key={x} className={`rounded-xl p-4 text-sm ${i <= 1 ? 'bg-forest/10 font-semibold' : 'bg-black/5 text-muted-foreground'}`}>{x}</div>)}</div></div>
        </main>
      </div>
    </div>
  );
}

function Module({ id, title, description, items }: { id: string; title: string; description: string; items: string[] }) {
  return <section id={id} className="rounded-2xl border border-black/10 bg-white p-7 shadow-sm"><h2 className="text-xl font-semibold text-[#0c1724]">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p><div className="mt-6 grid gap-2 sm:grid-cols-2">{items.map((item) => <div key={item} className="rounded-xl bg-[#f6f5f1] px-4 py-3 text-sm font-medium">{item}</div>)}</div></section>;
}
