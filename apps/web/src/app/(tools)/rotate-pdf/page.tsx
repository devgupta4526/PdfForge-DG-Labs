import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { ToolLayout } from '@/components/shared/tool-layout';
import { APP_NAME, APP_URL } from '@/lib/constants';

const RotateTool = dynamic(
  () => import('./components/RotateTool').then((mod) => ({ default: mod.RotateTool })),
  {
    ssr: false,
    loading: () => <RotateToolSkeleton />,
  },
);

const TOOL_TITLE = 'Rotate PDF — turn pages 90° or 180° in your browser';
const TOOL_DESCRIPTION =
  'Rotate every page of a PDF or just the ones you need — clockwise, counter-clockwise, or ' +
  'flipped. Runs entirely in your browser, so your file never leaves your device.';
const TOOL_URL = `${APP_URL.replace(/\/$/, '')}/rotate-pdf`;

export const metadata: Metadata = {
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  alternates: { canonical: TOOL_URL },
  keywords: [
    'rotate pdf',
    'rotate pdf pages',
    'pdf rotator',
    'rotate pdf 90 degrees',
    'rotate pdf 180',
    'browser pdf tools',
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
      name: 'Rotate PDF',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any (web browser)',
      description: TOOL_DESCRIPTION,
      url: TOOL_URL,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      isAccessibleForFree: true,
      featureList: [
        'Rotate individual pages 90° in either direction',
        'Bulk rotate every page (90° CW, 180°, 90° CCW)',
        'Live preview with CSS rotation — instant feedback',
        'Lossless: pages are not re-rendered, only the page rotation flag is updated',
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${TOOL_URL}#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Will rotating reduce the quality of my PDF?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Rotation only updates the page rotation flag in the PDF — the page content itself is not re-rendered. Quality is identical to the original.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does my file get uploaded anywhere?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. The Rotate PDF tool runs entirely in your browser using WebAssembly and JavaScript. Your file never leaves your device.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I rotate just one page?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes — every thumbnail has its own ↺ and ↻ buttons. The bulk "Rotate all" menu is only one option.',
          },
        },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${TOOL_URL}#breadcrumbs`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: APP_NAME, item: APP_URL },
        { '@type': 'ListItem', position: 2, name: 'Rotate PDF', item: TOOL_URL },
      ],
    },
  ],
};

export default function RotatePdfPage(): JSX.Element {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger -- structured data is server-rendered, trusted
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ToolLayout
        title="Rotate PDF"
        description="Spin pages 90° or 180° — one at a time or all at once. Runs in your browser."
        eyebrow="PDF tool"
        breadcrumbs={[{ href: '/rotate-pdf', label: 'Rotate PDF' }]}
      >
        <RotateTool />
      </ToolLayout>
    </>
  );
}

function RotateToolSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div className="h-[440px] animate-pulse rounded-xl border bg-muted/40" />
      <div className="h-[440px] animate-pulse rounded-xl border bg-muted/40" />
    </div>
  );
}
