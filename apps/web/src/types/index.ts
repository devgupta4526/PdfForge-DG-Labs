/**
 * Frontend-only types live here. Anything that crosses the
 * web ↔ api boundary belongs in `@pdf-forge/shared` instead.
 */

import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  icon?: LucideIcon;
}
