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
  },
} satisfies NextAuthConfig;
