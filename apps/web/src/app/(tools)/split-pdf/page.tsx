import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { APP_NAME, APP_URL } from '@/lib/constants';

const SplitTool = dynamic(
  () => import('./components/SplitTool').then((mod) => ({ default: mod.SplitTool })),
  {
    ssr: false,
    loading: () => <SplitToolSkeleton />,
  },
);

const TOOL_TITLE = 'Split PDF — extract pages or break a PDF into parts';
const TOOL_DESCRIPTION =
  'Split a PDF into multiple files by page range, by selecting individual pages, or by breaking ' +
  'it into fixed-size chunks. Runs entirely in your browser — your file never leaves your device.';
const TOOL_URL = `${APP_URL.replace(/\/$/, '')}/split-pdf`;

export const metadata: Metadata = {
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  alternates: { canonical: TOOL_URL },
  keywords: [
    'split pdf',
    'extract pdf pages',
    'pdf splitter',
    'split pdf by range',
    'split pdf online',
    'browser pdf tools',
    'private pdf tool',
  ],
  openGraph: {
    type: 'website',
    title: TOOL_TITLE,
    description: TOOL_DESCRIPTION,
    url: TOOL_URL,
    siteName: APP_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: TOOL_TITLE,
    description: TOOL_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': `${TOOL_URL}#software`,
      name: 'Split PDF',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any (web browser)',
      description: TOOL_DESCRIPTION,
      url: TOOL_URL,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      isAccessibleForFree: true,
      featureList: [
        'Split a PDF by page ranges (e.g. 1-3, 5, 8-10)',
        'Pick individual pages with thumbnail preview',
        'Split a PDF every N pages',
        'All processing happens locally in the browser',
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${TOOL_URL}#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Does my PDF get uploaded to a server?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. The Split PDF tool runs entirely in your browser using WebAssembly and JavaScript. Your file never leaves your device.',
          },
        },
        {
          '@type': 'Question',
          name: 'How big a PDF can I split?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Browser-side splitting works comfortably with PDFs up to about 100 MB. Very large or scan-heavy PDFs may be slow on low-memory devices.',
          },
        },
        {
          '@type': 'Question',
          name: 'What range syntax is supported?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Use comma-separated ranges or single pages, for example: "1-3, 5, 8-10". Each range becomes its own output file.',
          },
        },
        {
          '@type': 'Question',
          name: 'Will the output preserve the original quality?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Pages are copied losslessly into the new PDFs — there is no re-rendering or re-compression of page content.',
          },
        },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${TOOL_URL}#breadcrumbs`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: APP_NAME,
          item: APP_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Split PDF',
          item: TOOL_URL,
        },
      ],
    },
  ],
};

export default function SplitPdfPage(): JSX.Element {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger -- structured data is server-rendered, trusted
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="container py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-foreground">Split PDF</li>
          </ol>
        </nav>

        <header className="mx-auto mb-8 max-w-3xl space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Split PDF</h1>
          <p className="text-balance text-sm text-muted-foreground md:text-base">
            Break a PDF into multiple files by range, pick a few pages to keep, or split every N
            pages. Everything runs in your browser — no uploads, no accounts.
          </p>
        </header>

        <SplitTool />

        <section
          aria-labelledby="how-it-works"
          className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3"
        >
          <h2 id="how-it-works" className="sr-only">
            How it works
          </h2>
          <FeatureCallout
            title="100% private"
            body="Your PDF is processed locally with WebAssembly. No file ever leaves your device."
          />
          <FeatureCallout
            title="Lossless splitting"
            body="Pages are copied byte-for-byte into the output files — no re-rendering, no quality loss."
          />
          <FeatureCallout
            title="Three flexible modes"
            body="Split by ranges, hand-pick pages from a thumbnail grid, or split every N pages automatically."
          />
        </section>
      </section>
    </>
  );
}

function FeatureCallout({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function SplitToolSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="h-[420px] animate-pulse rounded-xl border bg-muted/40" />
      <div className="h-[420px] animate-pulse rounded-xl border bg-muted/40" />
    </div>
  );
}
