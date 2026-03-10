import DashboardClient from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  return (
    <div>
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
      </div>
      <div className="p-6">
        <DashboardClient />
      </div>
    </div>
  );
}
