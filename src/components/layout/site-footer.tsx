import { siteConfig } from "@/config/site";

const footerLinks = [
  { label: "포트폴리오", href: siteConfig.socialLinks.portfolio },
  { label: "GitHub", href: siteConfig.socialLinks.github },
] as const;

export function SiteFooter() {
  return (
    <footer className="container-shell mt-[var(--spacing-section)] border-t py-10 text-center text-xs text-tertiary">
      <nav
        aria-label="외부 링크"
        className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
      >
        {footerLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary transition-colors hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
        <span className="text-secondary">{siteConfig.socialLinks.email}</span>
      </nav>
      <p>Copyright ⓒ {siteConfig.author.name}</p>
    </footer>
  );
}
