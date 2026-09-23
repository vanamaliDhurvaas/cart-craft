/**
 * Next.js re-mounts a template on every navigation (unlike layout), which
 * gives us a lightweight page-enter transition for free.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
