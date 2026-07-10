/** Admin routes query Prisma at runtime — must not prerender during Docker build (no DB). */
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
