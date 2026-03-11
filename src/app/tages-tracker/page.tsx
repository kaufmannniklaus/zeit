import { TagesTrackerClient } from "@/components/tages-tracker/TagesTrackerClient";

export const metadata = {
  title: "Tages-Tracker – Zeit",
};

export default function TagesTrackerPage() {
  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tages-Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Arbeitszeit live erfassen · ARV-Pausen überwachen
        </p>
      </div>
      <TagesTrackerClient />
    </div>
  );
}
