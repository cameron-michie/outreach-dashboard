import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from './db';
import { env } from './env';
import { isAblyEmail } from './utils';
import { AuditLogModel } from './models';

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: env.google.clientId,
      clientSecret: env.google.clientSecret,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only allow @ably.com email addresses
      if (!user.email || !isAblyEmail(user.email)) {
        console.log(`Sign in denied for non-Ably email: ${user.email}`);
        return false;
      }

      return true;
    },

    async session({ session, user }) {
      if (session.user?.email) {
        // Add role information based on admin email list
        const isAdmin = env.app.adminEmails.includes(session.user.email);
        session.user.role = isAdmin ? 'admin' : 'user';
        session.user.isActive = true; // All users are active by default
        session.user.id = user.id;
      }

      return session;
    },
  },
  session: {
    strategy: 'database',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async createUser(message) {
      console.log(`New user created: ${message.user.email} with ID: ${message.user.id}`);

      // Log user creation
      try {
        await AuditLogModel.logAction(
          message.user.id,
          'user_registered',
          'campaign',
          message.user.id,
          { email: message.user.email, provider: 'google' }
        );
      } catch (error) {
        console.error('Error logging user creation:', error);
      }
    },
    async signIn(message) {
      if (message.user.email) {
        try {
          await AuditLogModel.logAction(
            message.user.id,
            'user_signed_in',
            'campaign',
            message.user.id,
            { provider: 'google' }
          );
        } catch (error) {
          console.error('Error logging sign in:', error);
        }
      }
    },
    async signOut(message) {
      if (message.session?.user?.email) {
        try {
          await AuditLogModel.logAction(
            message.session.user.id,
            'user_signed_out',
            'campaign',
            message.session.user.id,
            {}
          );
        } catch (error) {
          console.error('Error logging sign out:', error);
        }
      }
    },
  },
};

// Types extension for NextAuth
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: 'admin' | 'user';
      isActive: boolean;
    };
  }

  interface User {
    role: 'admin' | 'user';
    isActive: boolean;
  }
}