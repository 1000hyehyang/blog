import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="container-shell mt-[var(--spacing-section)] border-t py-10 text-center text-xs text-tertiary">
      <p>Copyright ⓒ {siteConfig.author.name}</p>
    </footer>
  );
}
