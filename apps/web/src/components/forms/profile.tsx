'use client';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { User } from '@documenso/prisma/client';
import { TRPCClientError } from '@documenso/trpc/client';
import { trpc } from '@documenso/trpc/react';
import { cn } from '@documenso/ui/lib/utils';
import { Button } from '@documenso/ui/primitives/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@documenso/ui/primitives/form/form';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { SignaturePad } from '@documenso/ui/primitives/signature-pad';
import { useToast } from '@documenso/ui/primitives/use-toast';

export const ZProfileFormSchema = z.object({
  name: z.string().trim().min(1, { message: 'Please enter a valid name.' }),
  signature: z.string().min(1, 'Signature Pad cannot be empty'),
});

export type TProfileFormSchema = z.infer<typeof ZProfileFormSchema>;

export type ProfileFormProps = {
  className?: string;
  user: User;
};

export const ProfileForm = ({ className, user }: ProfileFormProps) => {
  const router = useRouter();

  const { toast } = useToast();

  const form = useForm<TProfileFormSchema>({
    values: {
      name: user.name ?? '',
      signature: user.signature || '',
    },
    resolver: zodResolver(ZProfileFormSchema),
  });

  const isSubmitting = form.formState.isSubmitting;

  const { mutateAsync: updateProfile } = trpc.profile.updateProfile.useMutation();

  const onFormSubmit = async ({ name, signature }: TProfileFormSchema) => {
    try {
      await updateProfile({
        name,
        signature,
      });

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
        duration: 5000,
      });

      router.refresh();
    } catch (err) {
      if (err instanceof TRPCClientError && err.data?.code === 'BAD_REQUEST') {
        toast({
          title: 'An error occurred',
          description: err.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'An unknown error occurred',
          variant: 'destructive',
          description:
            'We encountered an unknown error while attempting to sign you In. Please try again later.',
        });
      }
    }
  };

  return (
    <Form {...form}>
      <form
        className={cn('flex w-full flex-col gap-y-4', className)}
        onSubmit={form.handleSubmit(onFormSubmit)}
      >
        <fieldset className="flex w-full flex-col gap-y-4" disabled={isSubmitting}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Label htmlFor="email" className="text-muted-foreground">
              Email
            </Label>
            <Input id="email" type="email" className="bg-muted mt-2" value={user.email} disabled />
          </div>

          <FormField
            control={form.control}
            name="signature"
            render={({ field: { onChange } }) => (
              <FormItem>
                <FormLabel>Signature</FormLabel>
                <FormControl>
                  <SignaturePad
                    className="h-44 w-full"
                    containerClassName="rounded-lg border bg-background"
                    defaultValue={user.signature ?? undefined}
                    onChange={(v) => onChange(v ?? '')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? 'Updating profile...' : 'Update profile'}
        </Button>
      </form>
    </Form>
  );
};
