import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';

import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Sign in',
  description: `Sign in to ${APP_NAME} to access your dashboard, history, and premium tools.`,
  robots: { index: false, follow: false },
};

export default function SignInPage(): JSX.Element {
  return (
    <section className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <SignIn appearance={{ elements: { card: 'shadow-lg' } }} />
    </section>
  );
}
