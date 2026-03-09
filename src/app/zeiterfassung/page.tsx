import { ZeiterfassungClient } from "@/components/zeiterfassung/ZeiterfassungClient";

export default function ZeiterfassungPage() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Zeiterfassung</h1>
      <ZeiterfassungClient />
    </main>
  );
}
