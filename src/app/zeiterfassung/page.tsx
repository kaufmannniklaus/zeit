import { ZeiterfassungClient } from "@/components/zeiterfassung/ZeiterfassungClient";

export default function ZeiterfassungPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 tracking-tight">Zeiterfassung</h1>
      <ZeiterfassungClient />
    </div>
  );
}
