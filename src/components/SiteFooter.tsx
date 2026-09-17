import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Linkedin, Facebook, Instagram, Youtube, MessageCircle, Send, Mail, MapPin } from "lucide-react";
import { useSiteConfig } from "../lib/siteConfig";
import { BrandMark } from "./BrandMark";

/**
 * The company footer. Full-bleed band in the brand navy with a gradient
 * rule on top, content inside the same max-width container every page uses,
 * so it never touches the screen edge whatever section sits above it.
 * Social icons appear only when the owner has set the page URL in Settings.
 * Legal pages are plain HTML under /public, so they are real anchors.
 */
export function SiteFooter({ className = "" }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const hi = i18n.language.startsWith("hi");
  const cfg = useSiteConfig();
  const year = new Date().getFullYear();
  const s = cfg?.social;
  // Each platform in its own colour: the icons are the one place on the page
  // where a splash of foreign colour is right, because people scan for them.
  const socials = [
    s?.linkedin ? { href: s.linkedin, label: "LinkedIn", Icon: Linkedin, bg: "#0A66C2" } : null,
    s?.facebook ? { href: s.facebook, label: "Facebook", Icon: Facebook, bg: "#1877F2" } : null,
    s?.instagram ? { href: s.instagram, label: "Instagram", Icon: Instagram, bg: "linear-gradient(45deg,#F58529,#DD2A7B 55%,#8134AF)" } : null,
    s?.youtube ? { href: s.youtube, label: "YouTube", Icon: Youtube, bg: "#FF0033" } : null,
    cfg?.whatsapp ? { href: `https://wa.me/${cfg.whatsapp}`, label: "WhatsApp", Icon: MessageCircle, bg: "#25D366" } : null,
    cfg?.telegram ? { href: `https://t.me/${cfg.telegram}`, label: "Telegram", Icon: Send, bg: "#2AABEE" } : null,
  ].filter(Boolean) as { href: string; label: string; Icon: typeof Linkedin; bg: string }[];

  const col = (title: string, items: { to?: string; href?: string; label: string }[]) => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">{title}</p>
      <ul className="mt-4 space-y-2.5 text-[15px]">
        {items.map((it) => (
          <li key={it.label}>
            {it.to
              ? <Link to={it.to} className="text-white/75 transition hover:text-white">{it.label}</Link>
              : <a href={it.href} className="text-white/75 transition hover:text-white">{it.label}</a>}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className={`mt-24 bg-[#0B1020] text-white ${className}`}>
      <div className="h-1 w-full bg-gradient-to-r from-[#0E9AAE] via-[#2563EB] to-[#DB2777]" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <BrandMark className="text-3xl" tagline />
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/70">
              {hi
                ? "एक छोटी टीम जो बढ़ते बिज़नेस के लिए सॉफ़्टवेयर, WhatsApp सिस्टम, वॉइस और टोल-फ़्री लाइनें बनाती और चलाती है। तय कीमत, हफ़्तों में, कोड आपका।"
                : "A small team that builds and runs the software, WhatsApp systems, voice and toll-free lines a growing business depends on. Fixed price, weeks not months, you own the code."}
            </p>
            <div className="mt-5 space-y-2 text-[15px] text-white/75">
              <a href="mailto:dushyant@goluq.com" className="flex items-center gap-2.5 transition hover:text-white"><Mail size={16} className="text-[#22D3EE]" /> dushyant@goluq.com</a>
              {cfg?.whatsapp && <a href={`https://wa.me/${cfg.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 transition hover:text-white"><MessageCircle size={16} className="text-[#25D366]" /> WhatsApp +{cfg.whatsapp.replace(/^91/, "91 ")}</a>}
              <p className="flex items-center gap-2.5"><MapPin size={16} className="text-[#22D3EE]" /> {hi ? "इंदौर, मध्य प्रदेश, भारत" : "Indore, Madhya Pradesh, India"}</p>
            </div>
            {socials.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2.5">
                {socials.map(({ href, label, Icon, bg }) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}
                    style={{ background: bg }}
                    className="grid h-11 w-11 place-items-center rounded-full text-white shadow-lg shadow-black/30 ring-2 ring-white/10 transition hover:-translate-y-0.5 hover:ring-white/40">
                    <Icon size={19} strokeWidth={2.2} />
                  </a>
                ))}
              </div>
            )}
          </div>
          {col(hi ? "समाधान" : "Solutions", [
            { to: "/solutions", label: hi ? "बिज़नेस के हिसाब से" : "By business and industry" },
            { to: "/whatsapp-office", label: "WhatsApp Office" },
            { to: "/whatsapp-store", label: "WhatsApp Store" },
            { to: "/services", label: hi ? "नंबर, कॉल और SMS" : "Numbers, calls and SMS" },
            { to: "/build", label: hi ? "कस्टम सॉफ़्टवेयर" : "Custom software" },
          ])}
          {col(hi ? "कंपनी" : "Company", [
            { to: "/about", label: hi ? "हमारे बारे में" : "About us" },
            { to: "/ceo", label: hi ? "अपने बिज़नेस के CEO बनिए" : "Become the CEO of your business" },
            { to: "/security", label: hi ? "डेटा सुरक्षा" : "How we secure your data" },
            { to: "/start", label: hi ? "अपनी ज़रूरत बताइए" : "Tell us your need" },
            { to: "/partner", label: hi ? "पार्टनर बनें" : "Become a partner" },
            { href: "/portal", label: t("footer.portal") },
          ])}
          {col(hi ? "कानूनी" : "Legal", [
            { href: "/privacy", label: t("footer.privacy") },
            { href: "/terms", label: t("footer.terms") },
            { href: "/terms#refunds", label: hi ? "रिफ़ंड और रद्दीकरण" : "Refunds and cancellations" },
          ])}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-[13px] text-white/50">
          <p>© {year} GoLuQ.com Digital Consultancy · {hi ? "सर्वाधिकार सुरक्षित" : "All rights reserved"}</p>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("goluq:openchat"))} className="transition hover:text-white">
            {hi ? "वेबसाइट पर चैट करें" : "Chat on the website"}
          </button>
        </div>
      </div>
    </footer>
  );
}
