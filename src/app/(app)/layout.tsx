// Protected app layout — auth enforced by middleware (src/middleware.ts).
// Layout just renders children; individual pages that need user data
// fetch their own token/session.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
