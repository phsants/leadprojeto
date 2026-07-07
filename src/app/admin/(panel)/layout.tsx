import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PanelNav from "@/components/PanelNav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-ink-50">
      <PanelNav nome={session.nome} papel={session.papel} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
