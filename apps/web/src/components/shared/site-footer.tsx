import { APP_NAME } from '@/lib/constants';

export function SiteFooter(): JSX.Element {
  return (
    <footer className="border-t border-border/40 py-8">
      <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground md:flex-row">
        <p>
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
        <p>Built with Next.js, Tailwind CSS &amp; shadcn/ui.</p>
      </div>
    </footer>
  );
}
