import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcrypt";
import User from "@/models/User";
import Analytics from "@/models/Analytics";
import dbConnect from "@/lib/dbConnect";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          provider: "google",
        };
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await dbConnect();
        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          throw new Error("No user found with this email");
        }
        if (user.provider !== "credentials") {
          throw new Error(`Please sign in via ${user.provider}`);
        }
        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!isValid) {
          throw new Error("Invalid password");
        }
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          provider: user.provider,
        };
      },
    }),
  ],
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // When user signs in, we have the user object
      if (user) {
        token.id = user.id;
        token.provider = user.provider;
        // Fetch the user from DB to get role and plan
        await dbConnect();
        const dbUser = await User.findById(user.id);
        if (dbUser) {
          token.role = dbUser.role;
          token.plan = dbUser.plan;
        } else {
          token.role = 'user';
          token.plan = 'free';
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id;
        session.user.provider = token.provider;
        session.user.role = token.role;
        session.user.plan = token.plan;
      }
      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      // Ensure user record has role and plan fields
      await dbConnect();
      const existingUser = await User.findOne({ email: user.email });
      if (existingUser) {
        // If fields missing, set defaults
        if (!existingUser.role) {
          existingUser.role = 'user';
        }
        if (!existingUser.plan) {
          existingUser.plan = 'free';
        }
        await existingUser.save();
        
        // Track login in analytics
        try {
          const analytics = new Analytics({
            userId: existingUser._id,
            action: 'login',
            metadata: {
              provider: account?.provider || 'credentials',
              method: account?.type || 'credentials'
            },
            createdAt: new Date()
          });
          await analytics.save();
        } catch (error) {
          console.error('Failed to log login analytics:', error);
          // Don't fail signin if analytics fails
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };