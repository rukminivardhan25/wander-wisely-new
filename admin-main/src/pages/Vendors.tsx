import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { vendorHubFetch } from "@/lib/api";

type VendorRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  aadhar_number: string | null;
  aadhar_name: string | null;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  created_at: string;
  updated_at: string;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

function cell(value: string | null | undefined): string {
  return value != null && String(value).trim() !== "" ? String(value).trim() : "—";
}

export function Vendors() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    vendorHubFetch<{ vendors: VendorRow[] }>("/api/admin/vendors")
      .then((data) => {
        if (!cancelled) setVendors(data.vendors ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load vendors");
        setVendors([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
        <p className="text-muted-foreground mt-1">All vendor profile details — owner, contact, Aadhar and bank information.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-forest-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-forest-200 flex items-center gap-2">
          <Building2 size={20} className="text-forest-600" />
          <span className="font-semibold text-foreground">Vendor details</span>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-forest-50 border-b border-forest-200">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 whitespace-nowrap">Owner name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 whitespace-nowrap">Email</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 whitespace-nowrap">Phone</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 whitespace-nowrap">Registered</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 whitespace-nowrap">Aadhar number</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 whitespace-nowrap">Name as on Aadhar</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 whitespace-nowrap">Bank account holder</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 whitespace-nowrap">Bank account no.</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 whitespace-nowrap">IFSC</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 whitespace-nowrap">Bank name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 whitespace-nowrap">Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-200">
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-muted-foreground">
                      No vendors found.
                    </td>
                  </tr>
                ) : (
                  vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-forest-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-foreground whitespace-nowrap">{cell(v.name)}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{v.email}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{cell(v.phone)}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{formatDate(v.created_at)}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{cell(v.aadhar_number)}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{cell(v.aadhar_name)}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{cell(v.bank_account_holder_name)}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{cell(v.bank_account_number)}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap font-mono">{cell(v.bank_ifsc)}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{cell(v.bank_name)}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{cell(v.bank_branch)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
