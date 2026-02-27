import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ChevronRight, ChevronLeft, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { vendorFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const COMPANY_STEPS = ["Company Details", "Authorized Person Details", "Submit"];

export default function AddHotel() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState({
    companyName: "",
    legalBusinessName: "",
    businessRegNumber: "",
    gstTaxId: "",
    companyEmail: "",
    companyPhone: "",
    headOfficeAddress: "",
    companyDescription: "",
    companyLogoUrl: "",
    authorizedPersonName: "",
    authorizedPersonDob: "",
    authorizedPersonDesignation: "",
    authorizedPersonPhone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const next = () => setStep((s) => Math.min(s + 1, COMPANY_STEPS.length - 1));
  const prev = () => (step === 0 ? navigate("/add-listing") : setStep((s) => s - 1));

  const handleCompanySubmit = async (asDraft: boolean) => {
    const name = company.companyName.trim();
    if (!name) {
      setSubmitError("Company name is required.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await vendorFetch("/api/listings", {
        method: "POST",
        body: JSON.stringify({
          name,
          type: "hotel",
          status: asDraft ? "draft" : "pending_approval",
          description: company.companyDescription.trim() || null,
          hotel_company: {
            company_name: name,
            legal_business_name: company.legalBusinessName.trim() || null,
            business_reg_number: company.businessRegNumber.trim() || null,
            gst_tax_id: company.gstTaxId.trim() || null,
            company_email: company.companyEmail.trim() || null,
            company_phone: company.companyPhone.trim() || null,
            head_office_address: company.headOfficeAddress.trim() || null,
            company_description: company.companyDescription.trim() || null,
            company_logo_url: company.companyLogoUrl || null,
            authorized_person_name: company.authorizedPersonName.trim() || null,
            authorized_person_dob: company.authorizedPersonDob || null,
            authorized_person_designation: company.authorizedPersonDesignation.trim() || null,
            authorized_person_phone: company.authorizedPersonPhone.trim() || null,
          },
        }),
      });
      navigate("/listings", {
        state: {
          message: asDraft
            ? "Hotel company saved as draft. Verify it from My Listings to add hotels."
            : "Hotel company submitted for verification. You can add hotels after approval.",
          success: true,
        },
      });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to create hotel company");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <button type="button" onClick={() => navigate("/add-listing")} className="hover:text-foreground">
          Add listing
        </button>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">Register Hotel Company</span>
      </div>

      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-7 w-7 text-amber-600" />
          Hotel Company Profile
        </h1>
        <p className="text-muted-foreground mt-1">Company must be verified before you can add hotels. After approval, add hotels from My Listings → Manage Hotels.</p>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {COMPANY_STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                i === step ? "bg-amber-600 text-white" : i < step ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check size={12} /> : <span>{i + 1}</span>}
              <span className="hidden sm:inline">{s}</span>
            </button>
            {i < COMPANY_STEPS.length - 1 && <ChevronRight size={14} className="mx-1 text-muted-foreground/50 shrink-0" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3">Company Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Company Name</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="e.g. Grand Hotels Pvt Ltd" value={company.companyName} onChange={(e) => setCompany((p) => ({ ...p, companyName: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Legal Business Name</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="As on registration certificate" value={company.legalBusinessName} onChange={(e) => setCompany((p) => ({ ...p, legalBusinessName: e.target.value }))} />
                </div>
                <div>
                  <Label>Business Registration Number</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="Reg. no." value={company.businessRegNumber} onChange={(e) => setCompany((p) => ({ ...p, businessRegNumber: e.target.value }))} />
                </div>
                <div>
                  <Label>GST / Tax ID</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="GSTIN" value={company.gstTaxId} onChange={(e) => setCompany((p) => ({ ...p, gstTaxId: e.target.value }))} />
                </div>
                <div>
                  <Label>Company Email</Label>
                  <Input type="email" className="mt-1.5 rounded-xl" placeholder="contact@company.com" value={company.companyEmail} onChange={(e) => setCompany((p) => ({ ...p, companyEmail: e.target.value }))} />
                </div>
                <div>
                  <Label>Company Phone</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="+91 ..." value={company.companyPhone} onChange={(e) => setCompany((p) => ({ ...p, companyPhone: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Head Office Address</Label>
                  <Textarea className="mt-1.5 rounded-xl resize-none" rows={2} placeholder="Full address" value={company.headOfficeAddress} onChange={(e) => setCompany((p) => ({ ...p, headOfficeAddress: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Company Description</Label>
                  <Textarea className="mt-1.5 rounded-xl resize-none" rows={3} placeholder="Brief about your company" value={company.companyDescription} onChange={(e) => setCompany((p) => ({ ...p, companyDescription: e.target.value }))} />
                </div>
                <div>
                  <Label>Company Logo</Label>
                  <div className="mt-1.5 border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-amber-500/50 transition-colors cursor-pointer bg-muted/20">
                    <Upload size={24} className="text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Upload logo</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3">Authorized Person Details</h2>
              <p className="text-sm text-muted-foreground">Details of the person authorized to represent the company.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Authorized Person Name</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="Full name" value={company.authorizedPersonName} onChange={(e) => setCompany((p) => ({ ...p, authorizedPersonName: e.target.value }))} />
                </div>
                <div>
                  <Label>Date of Birth (DOB)</Label>
                  <Input type="date" className="mt-1.5 rounded-xl" value={company.authorizedPersonDob} onChange={(e) => setCompany((p) => ({ ...p, authorizedPersonDob: e.target.value }))} />
                </div>
                <div>
                  <Label>Designation</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="e.g. Director, Proprietor" value={company.authorizedPersonDesignation} onChange={(e) => setCompany((p) => ({ ...p, authorizedPersonDesignation: e.target.value }))} />
                </div>
                <div>
                  <Label>Authorized Person Phone</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="+91 ..." value={company.authorizedPersonPhone} onChange={(e) => setCompany((p) => ({ ...p, authorizedPersonPhone: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <Check size={32} className="text-amber-600" />
              </div>
              <h2 className="font-display font-semibold text-lg text-foreground">Submit for verification</h2>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Submit only</p>
              <div className="rounded-xl bg-muted/50 border border-border/50 p-4 text-left max-w-md mx-auto">
                <h3 className="text-sm font-semibold text-foreground mb-2">Verify to do</h3>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2"><Check size={14} className="text-amber-600 shrink-0" /> Company details filled</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-amber-600 shrink-0" /> Authorized person details filled</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-amber-600 shrink-0" /> Submit for verification (below)</li>
                  <li className="flex items-center gap-2 text-foreground/80">After approval → My Listings → Manage Hotels to add hotels</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">Once approved, you can add multiple hotels from My Listings → Manage Hotels. You cannot add hotels until the company is approved.</p>
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button type="button" variant="outline" className="rounded-xl" disabled={submitting} onClick={() => handleCompanySubmit(true)}>
                  Save as Draft
                </Button>
                <Button type="button" className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white" disabled={submitting} onClick={() => handleCompanySubmit(false)}>
                  {submitting ? "Submitting…" : "Submit for verification"}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" className="rounded-xl gap-2" onClick={prev}>
          <ChevronLeft size={16} /> {step === 0 ? "Back to listing type" : "Previous"}
        </Button>
        {step < COMPANY_STEPS.length - 1 && (
          <Button type="button" className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white gap-2" onClick={next}>
            Next <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
