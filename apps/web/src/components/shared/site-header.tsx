import Link from 'next/link';
import { FileText } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { AuthActions } from '@/components/shared/auth-actions';

export function SiteHeader(): JSX.Element {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="text-base font-semibold tracking-tight">{APP_NAME}</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/#tools">Tools</Link>
          </Button>
          <AuthActions />
        </nav>
      </div>
    </header>
  );
}
