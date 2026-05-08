import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white">
      <div className="flex h-screen w-full min-h-0 overflow-hidden bg-[#f9fafb]">
        <Sidebar />
        <main className="relative flex min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
