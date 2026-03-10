import { ZeiterfassungClient } from "@/components/zeiterfassung/ZeiterfassungClient";

export default function ZeiterfassungPage() {
  return (
    <div>
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Zeiterfassung</h1>
      </div>
      <div className="p-6">
        <ZeiterfassungClient />
      </div>
    </div>
  );
}
