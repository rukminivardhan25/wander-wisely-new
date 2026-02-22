import { motion } from "framer-motion";
import { Upload, CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const documents = [
  { label: "Business License", status: "Verified", file: "business_license.pdf" },
  { label: "Owner ID", status: "Verified", file: "owner_id.pdf" },
  { label: "Tax Document", status: "Pending", file: "tax_doc.pdf" },
  { label: "Health & Safety Certificate", status: "Not Uploaded", file: null },
];

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string }> = {
  Verified: { icon: CheckCircle, color: "text-success" },
  Pending: { icon: Clock, color: "text-warning" },
  "Not Uploaded": { icon: XCircle, color: "text-muted-foreground" },
  Rejected: { icon: XCircle, color: "text-destructive" },
};

export default function Verification() {
  const verified = documents.filter((d) => d.status === "Verified").length;
  const progress = (verified / documents.length) * 100;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Verification</h1>
        <p className="text-muted-foreground mt-1">Upload your documents to get verified.</p>
      </div>

      {/* Progress */}
      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">Verification Progress</p>
          <p className="text-sm font-semibold text-accent">{Math.round(progress)}%</p>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full gold-gradient"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{verified} of {documents.length} documents verified</p>
      </div>

      {/* Documents */}
      <div className="space-y-3">
        {documents.map((doc, i) => {
          const cfg = statusConfig[doc.status];
          const StatusIcon = cfg.icon;
          return (
            <motion.div
              key={doc.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-card rounded-2xl shadow-card border border-border/50 p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <StatusIcon size={20} className={cfg.color} />
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.label}</p>
                  <p className="text-xs text-muted-foreground">{doc.file || "No file uploaded"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("text-xs font-medium", cfg.color)}>{doc.status}</span>
                {doc.status !== "Verified" && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                    <Upload size={14} /> Upload
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
