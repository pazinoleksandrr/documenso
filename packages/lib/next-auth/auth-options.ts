/// <reference types="../types/next-auth.d.ts" />
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcrypt';
import { DateTime } from 'luxon';
import type { AuthOptions, Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { GoogleProfile } from 'next-auth/providers/google';
import GoogleProvider from 'next-auth/providers/google';

import { prisma } from '@documenso/prisma';

import { isTwoFactorAuthenticationEnabled } from '../server-only/2fa/is-2fa-availble';
import { validateTwoFactorAuthentication } from '../server-only/2fa/validate-2fa';
import { getUserByEmail } from '../server-only/user/get-user-by-email';
import { ErrorCode } from './error-codes';

export const NEXT_AUTH_OPTIONS: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET ?? 'secret',
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totpCode: {
          label: 'Two-factor Code',
          type: 'input',
          placeholder: 'Code from authenticator app',
        },
        backupCode: { label: 'Backup Code', type: 'input', placeholder: 'Two-factor backup code' },
      },
      authorize: async (credentials, _req) => {
        if (!credentials) {
          throw new Error(ErrorCode.CREDENTIALS_NOT_FOUND);
        }

        const { email, password, backupCode, totpCode } = credentials;

        const user = await getUserByEmail({ email }).catch(() => {
          throw new Error(ErrorCode.INCORRECT_EMAIL_PASSWORD);
        });

        if (!user.password) {
          throw new Error(ErrorCode.USER_MISSING_PASSWORD);
        }

        const isPasswordsSame = await compare(password, user.password);

        if (!isPasswordsSame) {
          throw new Error(ErrorCode.INCORRECT_EMAIL_PASSWORD);
        }

        const is2faEnabled = isTwoFactorAuthenticationEnabled({ user });

        if (is2faEnabled) {
          const isValid = await validateTwoFactorAuthentication({ backupCode, totpCode, user });

          if (!isValid) {
            throw new Error(
              totpCode
                ? ErrorCode.INCORRECT_TWO_FACTOR_CODE
                : ErrorCode.INCORRECT_TWO_FACTOR_BACKUP_CODE,
            );
          }
        }

        return {
          id: Number(user.id),
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified?.toISOString() ?? null,
        } satisfies User;
      },
    }),
    GoogleProvider<GoogleProfile>({
      clientId: process.env.NEXT_PRIVATE_GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.NEXT_PRIVATE_GOOGLE_CLIENT_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,

      profile(profile) {
        return {
          id: Number(profile.sub),
          name: profile.name || `${profile.given_name} ${profile.family_name}`.trim(),
          email: profile.email,
          emailVerified: profile.email_verified ? new Date().toISOString() : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const merged = {
        ...token,
        ...user,
        emailVerified: user?.emailVerified ? new Date(user.emailVerified).toISOString() : null,
      } satisfies JWT;

      if (!merged.email || typeof merged.emailVerified !== 'string') {
        const userId = Number(merged.id ?? token.sub);

        const retrieved = await prisma.user.findFirst({
          where: {
            id: userId,
          },
        });

        if (!retrieved) {
          return token;
        }

        merged.id = retrieved.id;
        merged.name = retrieved.name;
        merged.email = retrieved.email;
        merged.emailVerified = retrieved.emailVerified?.toISOString() ?? null;
      }

      if (
        merged.id &&
        (!merged.lastSignedIn ||
          DateTime.fromISO(merged.lastSignedIn).plus({ hours: 1 }) <= DateTime.now())
      ) {
        merged.lastSignedIn = new Date().toISOString();

        const user = await prisma.user.update({
          where: {
            id: Number(merged.id),
          },
          data: {
            lastSignedIn: merged.lastSignedIn,
          },
        });

        merged.emailVerified = user.emailVerified?.toISOString() ?? null;
      }

      return {
        id: merged.id,
        name: merged.name,
        email: merged.email,
        lastSignedIn: merged.lastSignedIn,
        emailVerified: merged.emailVerified,
      } satisfies JWT;
    },

    session({ token, session }) {
      if (token && token.email) {
        return {
          ...session,
          user: {
            id: Number(token.id),
            name: token.name,
            email: token.email,
            emailVerified: token.emailVerified ?? null,
          },
        } satisfies Session;
      }

      return session;
    },

    async signIn({ user }) {
      // We do this to stop OAuth providers from creating an account
      // when signups are disabled
      if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === 'true') {
        const userData = await getUserByEmail({ email: user.email! });

        return !!userData;
      }

      return true;
    },
  },
};
