import type { NextAuthConfig } from "next-auth";

export default {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isAuthRoute =
        pathname.startsWith("/login") || pathname.startsWith("/signup");
      if (isAuthRoute) return true;
      const isAdminRoute = pathname.startsWith("/admin");
      if (isAdminRoute) return isLoggedIn && auth.user.role === "admin";
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role as "admin" | "user";
      return session;
    },
  },
} satisfies NextAuthConfig;
