import Link from 'next/link';

import { XCircle } from 'lucide-react';

import { Button } from '@documenso/ui/primitives/button';

export default function EmailVerificationWithoutTokenPage() {
  return (
    <div className="flex w-full items-start">
      <div className="mr-4 mt-1 hidden md:block">
        <XCircle className="text-destructive h-10 w-10" strokeWidth={2} />
      </div>

      <div>
        <h2 className="text-2xl font-bold md:text-4xl">Uh oh! Looks like you're missing a token</h2>

        <p className="text-muted-foreground mt-4">
          It seems that there is no token provided, if you are trying to verify your email please
          follow the link in your email.
        </p>

        <Button className="mt-4" asChild>
          <Link href="/">Go back home</Link>
        </Button>
      </div>
    </div>
  );
}
