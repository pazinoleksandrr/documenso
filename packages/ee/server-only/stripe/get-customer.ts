import { stripe } from '@documenso/lib/server-only/stripe';
import { prisma } from '@documenso/prisma';
import type { User } from '@documenso/prisma/client';

import { onSubscriptionUpdated } from './webhook/on-subscription-updated';

export const getStripeCustomerByEmail = async (email: string) => {
  const foundStripeCustomers = await stripe.customers.list({
    email,
  });

  return foundStripeCustomers.data[0] ?? null;
};

export const getStripeCustomerById = async (stripeCustomerId: string) => {
  try {
    const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);

    return !stripeCustomer.deleted ? stripeCustomer : null;
  } catch {
    return null;
  }
};

/**
 * Get a stripe customer by user.
 *
 * Will create a Stripe customer and update the relevant user if one does not exist.
 */
export const getStripeCustomerByUser = async (user: User) => {
  if (user.customerId) {
    const stripeCustomer = await getStripeCustomerById(user.customerId);

    if (!stripeCustomer) {
      throw new Error('Missing Stripe customer');
    }

    return {
      user,
      stripeCustomer,
    };
  }

  let stripeCustomer = await getStripeCustomerByEmail(user.email);

  const isSyncRequired = Boolean(stripeCustomer && !stripeCustomer.deleted);

  if (!stripeCustomer) {
    stripeCustomer = await stripe.customers.create({
      name: user.name ?? undefined,
      email: user.email,
      metadata: {
        userId: user.id,
      },
    });
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      customerId: stripeCustomer.id,
    },
  });

  // Sync subscriptions if the customer already exists for back filling the DB
  // and local development.
  if (isSyncRequired) {
    await syncStripeCustomerSubscriptions(user.id, stripeCustomer.id).catch((e) => {
      console.error(e);
    });
  }

  return {
    user: updatedUser,
    stripeCustomer,
  };
};

const syncStripeCustomerSubscriptions = async (userId: number, stripeCustomerId: string) => {
  const stripeSubscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
  });

  await Promise.all(
    stripeSubscriptions.data.map(async (subscription) =>
      onSubscriptionUpdated({
        userId,
        subscription,
      }),
    ),
  );
};
