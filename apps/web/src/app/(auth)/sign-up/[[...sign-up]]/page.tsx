import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';

import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Sign up',
  description: `Create your free ${APP_NAME} account to unlock higher daily quotas and history.`,
  robots: { index: false, follow: false },
};

export default function SignUpPage(): JSX.Element {
  return (
    <section className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <SignUp appearance={{ elements: { card: 'shadow-lg' } }} />
    </section>
  );
}
