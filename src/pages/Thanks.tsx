import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

/**
 * Where Razorpay sends people after a payment link. Razorpay appends
 * razorpay_payment_link_status=paid on success; anything else means they came
 * back without paying, and the page says so gently instead of thanking them
 * for nothing.
 */
export default function Thanks() {
  const [q] = useSearchParams();
  const paid = q.get("razorpay_payment_link_status") === "paid";
  return (
    <main className="grid min-h-dvh place-items-center bg-[#0B1020] px-6 text-white">
      <div className="max-w-md text-center">
        <CheckCircle2 size={48} className={`mx-auto ${paid ? "text-emerald-400" : "text-white/30"}`} />
        <h1 className="mt-5 font-display text-3xl font-bold">{paid ? "Payment received. Thank you." : "No payment went through."}</h1>
        <p className="mt-3 text-base text-white/70">
          {paid
            ? "Dushyant has been told and will message you on WhatsApp with the next step."
            : "Nothing was charged. Your link still works from the WhatsApp or email message; reply there if anything is unclear."}
        </p>
        <Link to="/" className="mt-8 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0B1020]">Back to GoLuQ.com</Link>
      </div>
    </main>
  );
}
