import type { PdfTool } from '@pdf-forge/shared';

export const APP_NAME = process.env['NEXT_PUBLIC_APP_NAME'] ?? 'PDF Forge';
export const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
export const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export const SITE_DESCRIPTION =
  'Fast, private, browser-first PDF tools. Merge, split, compress, convert, sign and more — without uploading your files to anyone.';

export interface ToolDefinition {
  id: PdfTool;
  title: string;
  description: string;
  href: string;
  /** True when the tool is fully shipped. False entries render a "Coming soon" badge. */
  available: boolean;
}

export const PDF_TOOLS: readonly ToolDefinition[] = [
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDFs into a single document, in the order you choose.',
    href: '/merge-pdf',
    available: false,
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Extract one or more page ranges into separate PDF files.',
    href: '/split-pdf',
    available: true,
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Re-encode embedded images at a lower quality to shrink the file.',
    href: '/compress-pdf',
    available: true,
  },
  {
    id: 'rotate',
    title: 'Rotate PDF',
    description: 'Rotate individual pages or the whole document — 90°, 180°, or 270°.',
    href: '/rotate-pdf',
    available: true,
  },
  {
    id: 'delete-pages',
    title: 'Delete pages',
    description: 'Pick the pages you want to remove and download a slimmer PDF.',
    href: '/delete-pages',
    available: true,
  },
  {
    id: 'pdf-to-image',
    title: 'PDF to Image',
    description: 'Convert each page of a PDF to a PNG or JPEG image.',
    href: '/tools/pdf-to-image',
    available: false,
  },
  {
    id: 'image-to-pdf',
    title: 'Image to PDF',
    description: 'Stitch JPG, PNG and HEIC images into one PDF.',
    href: '/tools/image-to-pdf',
    available: false,
  },
] as const;
