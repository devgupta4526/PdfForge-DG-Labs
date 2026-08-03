import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ToolCard } from '@/components/shared/tool-card';
import { PDF_TOOLS } from '@/lib/constants';

export default function HomePage(): JSX.Element {
  return (
    <>
      <section className="container flex flex-col items-center gap-6 py-20 text-center md:py-28">
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          v0.1 — early preview
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Every PDF tool you need.
          <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Fast, private, and free.
          </span>
        </h1>
        <p className="max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
          Merge, split, compress, convert and sign PDFs — most operations run entirely in your
          browser, so your documents never leave your device.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="#tools">Explore tools</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="https://github.com" target="_blank" rel="noreferrer noopener">
              View on GitHub
            </Link>
          </Button>
        </div>
      </section>

      <section id="tools" className="container py-12 md:py-20">
        <div className="mb-10 flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">All tools</h2>
          <p className="text-sm text-muted-foreground">
            Pick a tool to get started — more are added every week.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PDF_TOOLS.map((tool) => (
            <ToolCard
              key={tool.id}
              title={tool.title}
              description={tool.description}
              href={tool.href}
              available={tool.available}
            />
          ))}
        </div>
      </section>
    </>
  );
}
