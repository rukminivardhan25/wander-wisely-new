import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Hotel, ArrowLeft, MapPin, CalendarDays, User, FileText, Download } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type HotelBookingDetail = {
  id: string;
  bookingRef: string;
  hotelBranchId: string;
  listingId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  requirementsText?: string;
  documentUrls: { label?: string; url?: string }[];
  status: string;
  roomType?: string;
  roomNumber?: string;
  totalCents?: number;
  vendorNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  branchName?: string;
  branchCity?: string;
  branchFullAddress?: string;
  branchContactNumber?: string;
  listingName?: string;
};

const HOTEL_TERMS = [
  "Check-in and check-out times are as per hotel policy. Early check-in or late check-out may incur additional charges.",
  "Guests must provide valid ID at check-in. The name on the booking must match the ID.",
  "Cancellation and modification policies apply as per the hotel's terms. Please contact the hotel directly for changes.",
  "The hotel reserves the right to refuse accommodation if guest behaviour is deemed inappropriate or if documents are invalid.",
  "Rates are inclusive of taxes as displayed unless otherwise stated. Any extra services (minibar, laundry, etc.) are chargeable.",
  "Guests are responsible for any damage to hotel property beyond normal wear and tear.",
  "This confirmation is subject to the hotel's approval. Room number and final amount may be confirmed by the hotel upon approval.",
];

const HotelReceipt = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [booking, setBooking] = useState<HotelBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !token) {
      if (!token) setError("Sign in to view your receipt.");
      setLoading(false);
      return;
    }
    setError("");
    apiFetch<HotelBookingDetail>(`/api/hotel-bookings/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(({ data, error: err }) => {
        setLoading(false);
        const errMsg = typeof err === "string" ? err : err ? String(err) : "";
        if (errMsg) setError(errMsg);
        else if (data) setBooking(data);
        else setError("Booking not found.");
      })
      .catch((e) => {
        setLoading(false);
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      });
  }, [id, token]);

  if (!token) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Sign in to view your hotel receipt.</p>
            <Link to="/signin" className="text-accent hover:underline">Sign In</Link>
          </div>
        </section>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading receipt…</p>
        </section>
      </Layout>
    );
  }

  if (error || !booking) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || "Booking not found."}</p>
            <Link to="/my-trip" className="text-accent hover:underline">Back to My Trip</Link>
          </div>
        </section>
      </Layout>
    );
  }

  const status = (booking.status || "").trim().toLowerCase();
  // Hotel flow: pending_vendor → vendor approves + room number → approved_awaiting_payment → user pays → confirmed (only approved_awaiting_payment is valid for pay)
  const isAwaitingPayment = status === "approved_awaiting_payment";
  const statusLabel =
    status === "pending_vendor"
      ? "Pending hotel approval"
      : isAwaitingPayment
        ? "Bill ready — Pay now"
        : status === "confirmed"
          ? "Confirmed"
          : status === "rejected"
            ? "Rejected"
            : "Awaiting payment";
  const isPending = status === "pending_vendor";

  const [payLoading, setPayLoading] = useState(false);

  const handlePayNow = async () => {
    if (!id || !token || !isAwaitingPayment) return;
    setPayLoading(true);
    try {
      const { data: payData, error: payErr } = await apiFetch<{ ok: boolean; status: string }>(`/api/hotel-bookings/${id}/pay`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (payErr) throw new Error(payErr);
      if (payData?.ok) {
        setBooking((prev) => (prev ? { ...prev, status: "confirmed" } : null));
      }
    } catch {
      setError("Payment failed. Please try again.");
    } finally {
      setPayLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    window.print();
  };

  return (
    <Layout>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .hotel-receipt-print, .hotel-receipt-print * { visibility: visible; }
          .hotel-receipt-print { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="min-h-screen bg-slate-50/80 pt-20 pb-16">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 no-print">
            <Link
              to="/my-trip"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to My Trip
            </Link>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl gap-2"
              onClick={handleDownloadReceipt}
            >
              <Download className="h-4 w-4" /> Download receipt
            </Button>
          </div>

          {/* Pending: no bill yet */}
          {isPending && (
            <div className="hotel-receipt-print bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-amber-600 text-white px-6 py-5">
                <div className="flex items-center gap-2">
                  <Hotel className="h-8 w-8" />
                  <div>
                    <h1 className="text-xl font-bold">{booking.listingName ?? "Hotel"}</h1>
                    {booking.branchName && <p className="text-amber-100 text-sm">{booking.branchName}</p>}
                  </div>
                </div>
                <p className="text-amber-100 text-sm mt-2 font-mono">Booking ref: {booking.bookingRef}</p>
                <p className="text-sm mt-1 font-medium text-amber-100">Status: Pending hotel approval</p>
              </div>
              <div className="p-6">
                <p className="text-foreground font-medium">Request sent</p>
                <p className="text-sm text-muted-foreground mt-1">Waiting for the hotel to confirm and allot a room. There is no bill yet — you’ll be able to pay and get your bill once they approve.</p>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs text-muted-foreground">Check-in: {booking.checkIn} · Check-out: {booking.checkOut} · {booking.nights} night(s)</p>
                  {booking.roomType && <p className="text-xs text-muted-foreground mt-0.5">Room type: {booking.roomType}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Bill-style receipt (only when approved or rejected) */}
          {!isPending && (
          <div className="hotel-receipt-print bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-amber-600 text-white px-6 py-5">
              <div className="flex items-center gap-2">
                <Hotel className="h-8 w-8" />
                <div>
                  <h1 className="text-xl font-bold">{booking.listingName ?? "Hotel"}</h1>
                  {booking.branchName && <p className="text-amber-100 text-sm">{booking.branchName}</p>}
                </div>
              </div>
              <p className="text-amber-100 text-sm mt-2 font-mono">Booking ref: {booking.bookingRef}</p>
              <p className={`text-sm mt-1 font-medium ${isAwaitingPayment ? "text-blue-200" : status === "confirmed" ? "text-emerald-200" : status === "rejected" ? "text-red-200" : "text-amber-100"}`}>
                Status: {statusLabel}
              </p>
              {status === "rejected" && booking.rejectionReason && (
                <p className="text-sm mt-1 text-red-100">Reason: {booking.rejectionReason}</p>
              )}
            </div>

            <div className="p-6 space-y-6">
              {/* Stay details */}
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Stay details</h2>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span>Check-in: {booking.checkIn}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span>Check-out: {booking.checkOut}</span>
                  </div>
                  <div><span className="text-muted-foreground">Nights: </span>{booking.nights}</div>
                  {booking.roomType && (
                    <div><span className="text-muted-foreground">Room type: </span>{booking.roomType}</div>
                  )}
                  {booking.roomNumber && (
                    <div className="font-medium text-foreground">Room: {booking.roomNumber}</div>
                  )}
                </div>
              </div>

              {/* Guest */}
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Guest</h2>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>{booking.guestName}</span>
                </div>
                {booking.guestPhone && <p className="text-sm text-muted-foreground mt-1">{booking.guestPhone}</p>}
                {booking.guestEmail && <p className="text-sm text-muted-foreground">{booking.guestEmail}</p>}
              </div>

              {/* Branch address */}
              {(booking.branchFullAddress || booking.branchCity) && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Hotel address</h2>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      {booking.branchFullAddress && <p>{booking.branchFullAddress}</p>}
                      {booking.branchCity && <p className="text-muted-foreground">{booking.branchCity}</p>}
                      {booking.branchContactNumber && <p className="mt-1">Contact: {booking.branchContactNumber}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Requirements */}
              {booking.requirementsText && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Special requests</h2>
                  <p className="text-sm text-foreground">{booking.requirementsText}</p>
                </div>
              )}

              {/* Document links */}
              {booking.documentUrls?.length > 0 && booking.documentUrls.some((d) => d.label || d.url) && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                    <FileText className="h-4 w-4" /> Documents submitted
                  </h2>
                  <ul className="text-sm space-y-1">
                    {booking.documentUrls.filter((d) => d.label || d.url).map((d, i) => (
                      <li key={i}>
                        {d.label && <span>{d.label}: </span>}
                        {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all">{d.url}</a> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Vendor notes (e.g. after approval) */}
              {booking.vendorNotes && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-sm font-medium text-slate-600">Hotel message</p>
                  <p className="text-sm text-foreground mt-1">{booking.vendorNotes}</p>
                </div>
              )}

              {/* Total & payment */}
              {booking.totalCents != null && (
                <div className="border-t border-slate-200 pt-4 space-y-2">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total</span>
                    <span>₹{(booking.totalCents / 100).toFixed(2)}</span>
                  </div>
                  {isAwaitingPayment && (
                    <div className="flex flex-col gap-2 no-print">
                      <p className="text-sm text-muted-foreground">Pay now to confirm your booking.</p>
                      <Button type="button" className="w-full sm:w-auto rounded-xl bg-amber-600 hover:bg-amber-700" onClick={handlePayNow} disabled={payLoading}>
                        {payLoading ? "Processing…" : "Pay now"}
                      </Button>
                    </div>
                  )}
                  {status === "confirmed" && (
                    <p className="text-sm text-muted-foreground">
                      Payment complete. Present this receipt at check-in along with a valid ID.
                    </p>
                  )}
                </div>
              )}
              {/* Pay now when approved but total not yet set (vendor approved with room only) */}
              {isAwaitingPayment && booking.totalCents == null && (
                <div className="border-t border-slate-200 pt-4 space-y-2 no-print">
                  <p className="text-sm text-muted-foreground">Pay now to confirm your booking. Amount may be confirmed at check-in if not set by the hotel.</p>
                  <Button type="button" className="w-full sm:w-auto rounded-xl bg-amber-600 hover:bg-amber-700" onClick={handlePayNow} disabled={payLoading}>
                    {payLoading ? "Processing…" : "Pay now"}
                  </Button>
                </div>
              )}

              {/* Terms and conditions */}
              <div className="border-t border-slate-200 pt-6">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Terms and conditions</h2>
                <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
                  {HOTEL_TERMS.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-muted-foreground">
              Generated on {new Date(booking.createdAt).toLocaleString()}. This is your hotel booking confirmation. Present this at check-in along with a valid ID.
            </div>
          </div>
          )}

          <div className="mt-6 flex justify-center no-print">
            <Link to="/my-trip/book" className="text-accent hover:underline text-sm">Book another stay</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HotelReceipt;
