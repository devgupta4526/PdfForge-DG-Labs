import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { ToolLayout } from '@/components/shared/tool-layout';
import { APP_NAME, APP_URL } from '@/lib/constants';

const DeletePagesTool = dynamic(
  () => import('./components/DeletePagesTool').then((mod) => ({ default: mod.DeletePagesTool })),
  {
    ssr: false,
    loading: () => <DeletePagesToolSkeleton />,
  },
);

const TOOL_TITLE = 'Delete PDF pages — remove pages from a PDF in your browser';
const TOOL_DESCRIPTION =
  'Pick the pages you want to remove from a PDF and download a new file with just the pages ' +
  'you keep. Runs entirely in your browser — your file never leaves your device.';
const TOOL_URL = `${APP_URL.replace(/\/$/, '')}/delete-pages`;

export const metadata: Metadata = {
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  alternates: { canonical: TOOL_URL },
  keywords: [
    'delete pdf pages',
    'remove pages from pdf',
    'pdf page remover',
    'delete page from pdf',
    'pdf page deleter',
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
      name: 'Delete PDF pages',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any (web browser)',
      description: TOOL_DESCRIPTION,
      url: TOOL_URL,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      isAccessibleForFree: true,
      featureList: [
        'Multi-select pages with thumbnail preview',
        'Live counter — see how many pages will be removed and how many will remain',
        'Confirmation step before generating the new PDF',
        'Lossless: kept pages are copied byte-for-byte into the result',
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${TOOL_URL}#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Will the original PDF be modified?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. The tool builds a brand new PDF from the pages you keep — your original file is never overwritten.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I delete every page?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. The result must contain at least one page, so the tool blocks an "all pages" selection and shows an error.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does my file get uploaded anywhere?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Page deletion runs entirely in your browser. Your file never leaves your device.',
          },
        },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${TOOL_URL}#breadcrumbs`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: APP_NAME, item: APP_URL },
        { '@type': 'ListItem', position: 2, name: 'Delete pages', item: TOOL_URL },
      ],
    },
  ],
};

export default function DeletePagesPage(): JSX.Element {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger -- structured data is server-rendered, trusted
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ToolLayout
        title="Delete PDF pages"
        description="Tick the pages you want to remove and download a slimmer PDF — runs entirely in your browser."
        eyebrow="PDF tool"
        breadcrumbs={[{ href: '/delete-pages', label: 'Delete pages' }]}
      >
        <DeletePagesTool />
      </ToolLayout>
    </>
  );
}

function DeletePagesToolSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div className="h-[440px] animate-pulse rounded-xl border bg-muted/40" />
      <div className="h-[440px] animate-pulse rounded-xl border bg-muted/40" />
    </div>
  );
}
