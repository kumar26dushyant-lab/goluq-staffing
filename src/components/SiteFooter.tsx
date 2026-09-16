import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Linkedin, Facebook, Instagram, Youtube, MessageCircle, Send, Mail } from "lucide-react";
import { useSiteConfig } from "../lib/siteConfig";

/**
 * The footer a company has: who we are, how to reach us, where we are on
 * social, and the pages a reviewer or a customer looks for. Legal pages are
 * plain HTML under /public, so they are real anchors; the rest are routes.
 * Social icons appear only when the owner has set the page URL in Settings.
 */
export function SiteFooter({ className = "" }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const hi = i18n.language.startsWith("hi");
  const cfg = useSiteConfig();
  const year = new Date().getFullYear();
  const s = cfg?.social;
  const socials = [
    s?.linkedin ? { href: s.linkedin, label: "LinkedIn", Icon: Linkedin } : null,
    s?.facebook ? { href: s.facebook, label: "Facebook", Icon: Facebook } : null,
    s?.instagram ? { href: s.instagram, label: "Instagram", Icon: Instagram } : null,
    s?.youtube ? { href: s.youtube, label: "YouTube", Icon: Youtube } : null,
    cfg?.whatsapp ? { href: `https://wa.me/${cfg.whatsapp}`, label: "WhatsApp", Icon: MessageCircle } : null,
    cfg?.telegram ? { href: `https://t.me/${cfg.telegram}`, label: "Telegram", Icon: Send } : null,
  ].filter(Boolean) as { href: string; label: string; Icon: typeof Linkedin }[];

  const col = (title: string, items: { to?: string; href?: string; label: string }[]) => (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-faint">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li key={it.label}>
            {it.to ? <Link to={it.to} className="hover:text-fg">{it.label}</Link> : <a href={it.href} className="hover:text-fg">{it.label}</a>}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className={`mt-20 border-t border-hairline/12 pt-10 text-sm text-muted ${className}`}>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-display text-lg font-bold text-fg">GoLuQ.com Digital Consultancy</p>
          <p className="mt-2 max-w-xs leading-relaxed">
            {hi
              ? "एक छोटी टीम जो बढ़ते बिज़नेस के लिए सॉफ़्टवेयर, WhatsApp सिस्टम, वॉइस और टोल-फ़्री लाइनें बनाती और चलाती है। इंदौर, भारत।"
              : "A small team that builds and runs the software, WhatsApp systems, voice and toll-free lines a growing business depends on. Indore, India."}
          </p>
          <a href="mailto:dushyant@goluq.com" className="mt-3 inline-flex items-center gap-2 hover:text-fg"><Mail size={15} /> dushyant@goluq.com</a>
          {socials.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {socials.map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className="grid h-9 w-9 place-items-center rounded-full border border-hairline/20 text-muted hover:border-brand-luq/50 hover:text-fg">
                  <Icon size={16} />
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
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-hairline/10 py-5 text-xs text-faint">
        <p>© {year} GoLuQ.com Digital Consultancy. {hi ? "सर्वाधिकार सुरक्षित।" : "All rights reserved."}</p>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("goluq:openchat"))} className="hover:text-fg">
          {hi ? "वेबसाइट पर चैट करें" : "Chat on the website"}
        </button>
      </div>
    </footer>
  );
}
