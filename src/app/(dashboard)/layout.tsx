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
        <main className="relative flex flex-1 min-w-0 min-h-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
