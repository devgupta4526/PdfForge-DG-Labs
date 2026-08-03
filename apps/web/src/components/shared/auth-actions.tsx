'use client';

import * as React from 'react';
import Link from 'next/link';
import { LayoutDashboard, LogIn } from 'lucide-react';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs';

import { Button } from '@/components/ui/button';

const HAS_CLERK = Boolean(process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']);

/**
 * Right-hand side of the site header. When Clerk is configured, shows
 * Sign in / Sign up CTAs to anonymous visitors and the UserButton + a
 * Dashboard link to authed users. Without Clerk, falls back to a single
 * "Get started" CTA so the marketing chrome still renders sensibly.
 */
export function AuthActions(): JSX.Element {
  if (!HAS_CLERK) {
    return (
      <Button asChild variant="default" size="sm">
        <Link href="/#tools">Get started</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SignedOut>
        <SignInButton mode="modal">
          <Button variant="ghost" size="sm">
            <LogIn aria-hidden className="h-4 w-4" />
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button variant="default" size="sm">
            Sign up
          </Button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            <LayoutDashboard aria-hidden className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: { avatarBox: 'h-8 w-8' },
          }}
        />
      </SignedIn>
    </div>
  );
}
