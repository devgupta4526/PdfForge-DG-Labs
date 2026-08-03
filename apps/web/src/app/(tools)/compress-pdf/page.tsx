import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { ToolLayout } from '@/components/shared/tool-layout';
import { APP_NAME, APP_URL } from '@/lib/constants';

const CompressTool = dynamic(
  () => import('./components/CompressTool').then((mod) => ({ default: mod.CompressTool })),
  {
    ssr: false,
    loading: () => <CompressToolSkeleton />,
  },
);

const TOOL_TITLE = 'Compress PDF — shrink file size while keeping it readable';
const TOOL_DESCRIPTION =
  'Compress a PDF by re-encoding embedded images at a lower quality. Choose Low, Medium, or ' +
  'High based on the trade-off you want between size and fidelity. Files are deleted from our ' +
  'server within an hour of processing.';
const TOOL_URL = `${APP_URL.replace(/\/$/, '')}/compress-pdf`;

export const metadata: Metadata = {
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  alternates: { canonical: TOOL_URL },
  keywords: [
    'compress pdf',
    'reduce pdf size',
    'pdf compressor',
    'shrink pdf',
    'optimize pdf',
    'pdf size reducer',
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
      name: 'Compress PDF',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any (web browser)',
      description: TOOL_DESCRIPTION,
      url: TOOL_URL,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      isAccessibleForFree: true,
      featureList: [
        'Three compression presets (Low, Medium, High)',
        'Re-encodes embedded JPEG and raw raster images',
        'Strips metadata at Medium and High',
        'Flattens form fields at High',
        'Files deleted from the server within one hour',
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${TOOL_URL}#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does PDF compression work here?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We walk through the PDF and re-encode each embedded image at a lower JPEG quality and/or smaller pixel dimension. Vector content (text, lines, shapes) is left untouched, so it stays crisp.',
          },
        },
        {
          '@type': 'Question',
          name: 'Will I lose any text quality?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Text is vector data and is never re-encoded. Only photos and other raster images change.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which level should I pick?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Pick Low for archival-grade fidelity, Medium as a sensible default for sharing online, and High when you need to fit a heavy document under an attachment limit.',
          },
        },
        {
          '@type': 'Question',
          name: 'How long do you keep my file?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Compressed PDFs are kept just long enough for you to download them, and are removed from our storage automatically within one hour.',
          },
        },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${TOOL_URL}#breadcrumbs`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: APP_NAME, item: APP_URL },
        { '@type': 'ListItem', position: 2, name: 'Compress PDF', item: TOOL_URL },
      ],
    },
  ],
};

export default function CompressPdfPage(): JSX.Element {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger -- structured data is server-rendered, trusted
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ToolLayout
        title="Compress PDF"
        description="Shrink a PDF by re-encoding its embedded images. Pick a preset, upload, download — done."
        eyebrow="PDF tool"
        breadcrumbs={[{ href: '/compress-pdf', label: 'Compress PDF' }]}
      >
        <CompressTool />
      </ToolLayout>
    </>
  );
}

function CompressToolSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="h-[480px] animate-pulse rounded-xl border bg-muted/40" />
      <div className="h-[480px] animate-pulse rounded-xl border border-dashed bg-muted/20" />
    </div>
  );
}
