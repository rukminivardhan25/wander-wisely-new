import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import QRCode from "qrcode";

export type TicketCardProps = {
  bookingId: string;
  bus: {
    listingName: string;
    busName: string;
    registrationNumber?: string | null;
    busNumber?: string | null;
    departureTime: string;
    driverName?: string | null;
    driverPhone?: string | null;
  };
  selectedSeats: number[];
  travelDate: string;
  routeFrom: string;
  routeTo: string;
  totalCents: number;
  passengerName?: string;
  passengerPhone?: string;
};

const TicketCard = ({
  bookingId,
  bus,
  selectedSeats,
  travelDate,
  routeFrom,
  routeTo,
  totalCents,
  passengerName,
  passengerPhone,
}: TicketCardProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    QRCode.toDataURL(bookingId, { width: 160, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [bookingId]);

  const totalRupees = (totalCents / 100).toLocaleString("en-IN");

  const handleDownloadTicket = () => {
    window.print();
  };

  return (
    <div className="ticket-print-area bg-white rounded-2xl shadow-lg border border-slate-200 p-6 text-sm">
      <h2 className="text-lg font-semibold text-foreground mb-4">Your ticket</h2>

      <div className="space-y-4">
        <div className="border-b border-dotted border-slate-300 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Company</p>
          <p className="font-semibold text-foreground">{bus.listingName}</p>
          <p className="text-muted-foreground">{bus.busName}</p>
          {(bus.registrationNumber || bus.busNumber) && (
            <p className="text-muted-foreground text-xs mt-1">
              {bus.registrationNumber && <span>Reg: {bus.registrationNumber}</span>}
              {bus.registrationNumber && bus.busNumber && " · "}
              {bus.busNumber && <span>Bus No: {bus.busNumber}</span>}
            </p>
          )}
        </div>

        <div className="border-b border-dotted border-slate-300 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Booking ID</p>
          <p className="font-bold text-foreground">{bookingId}</p>
        </div>

        <div className="border-b border-dotted border-slate-300 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Route</p>
          <p className="font-medium text-foreground">{routeFrom} → {routeTo}</p>
        </div>

        <div className="border-b border-dotted border-slate-300 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Date &amp; time</p>
          <p className="text-foreground">{travelDate} · {bus.departureTime}</p>
        </div>

        <div className="border-b border-dotted border-slate-300 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Seat numbers</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {selectedSeats.map((s) => (
              <span key={s} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
                {s}
              </span>
            ))}
          </div>
        </div>

        {(passengerName || passengerPhone) && (
          <div className="border-b border-dotted border-slate-300 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Passenger</p>
            {passengerName && <p className="text-foreground">{passengerName}</p>}
            {passengerPhone && <p className="text-foreground text-xs">Phone: {passengerPhone}</p>}
          </div>
        )}

        {(bus.driverName || bus.driverPhone) && (
          <div className="border-b border-dotted border-slate-300 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Driver</p>
            {bus.driverName && <p className="text-foreground">{bus.driverName}</p>}
            {bus.driverPhone && <p className="text-foreground text-xs">Phone: {bus.driverPhone}</p>}
          </div>
        )}

        <div className="border-b border-dotted border-slate-300 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount paid</p>
          <p className="font-semibold text-foreground">₹ {totalRupees}</p>
        </div>

        <div className="border-b border-dotted border-slate-300 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment status</p>
          <p className="font-medium text-emerald-600">Paid</p>
        </div>

        <div className="flex justify-center py-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Booking QR code" width={160} height={160} className="rounded" />
          ) : (
            <div className="w-40 h-40 bg-slate-100 rounded animate-pulse flex items-center justify-center text-xs text-muted-foreground">QR…</div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2 border-t border-dotted border-slate-300">
          Show this ticket at boarding
        </p>
      </div>

      <Button
        variant="outline"
        className="ticket-download-btn w-full mt-6 rounded-xl gap-2"
        onClick={handleDownloadTicket}
      >
        <Download className="h-4 w-4" /> Download Ticket
      </Button>
    </div>
  );
};

export default TicketCard;
