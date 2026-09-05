// ZENO — Payment Feature: Bulk (Recurring Series) Success Landing Page
// Route: /payment/bulk-success?session_id=cs_test_...
// Verifies the Stripe session server-side (all occurrences in the series at
// once), then shows a confirmation summary.

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../../services/api";

export default function BulkPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  const [state, setState] = useState("verifying"); // "verifying" | "success" | "error"
  const [count, setCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const calledRef = useRef(false); // prevent double-call in React strict mode

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setErrorMsg("No session ID found in the URL.");
      return;
    }

    if (calledRef.current) return;
    calledRef.current = true;

    const verify = async () => {
      try {
        const res = await API.post("/payments/verify-bulk-session", { sessionId });
        if (res.data.success) {
          setCount(res.data.count || 0);
          setState("success");
        } else {
          setState("error");
          setErrorMsg("Verification failed. Please contact support.");
        }
      } catch (err) {
        setState("error");
        setErrorMsg(
          err.response?.data?.error || "Could not verify payment. Please contact support."
        );
      }
    };

    verify();
  }, [sessionId]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-lg border-4 border-black p-10 text-center">

        {/* Verifying */}
        {state === "verifying" && (
          <>
            <div className="mx-auto mb-6 h-12 w-12 animate-spin border-4 border-black border-t-transparent rounded-full" />
            <p className="font-mono text-sm font-bold uppercase tracking-widest">
              Verifying payment…
            </p>
            <p className="mt-2 font-mono text-xs text-gray-500">
              Please wait, do not close this tab.
            </p>
          </>
        )}

        {/* Success */}
        {state === "success" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border-4 border-black bg-black text-white text-3xl font-black">
              ✓
            </div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
              Payment Confirmed
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase">
              Series Paid!
            </h1>
            <p className="mt-4 font-mono text-sm text-gray-600">
              {count} booking{count === 1 ? "" : "s"} in your recurring series{" "}
              {count === 1 ? "has" : "have"} been confirmed, and an invoice was
              generated for each. Use the test card{" "}
              <span className="font-bold text-black">4242 4242 4242 4242</span>{" "}
              for future sandbox tests.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => navigate("/invoices")}
                className="border-2 border-black bg-black px-6 py-3 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black transition-colors"
              >
                View Invoices →
              </button>
              <button
                type="button"
                onClick={() => navigate("/bookings/recurring")}
                className="border-2 border-black bg-white px-6 py-3 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
              >
                Recurring Bookings
              </button>
            </div>
          </>
        )}

        {/* Error */}
        {state === "error" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border-4 border-black bg-white text-3xl font-black">
              ✕
            </div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-red-700">
              Verification Failed
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase">
              Something went wrong
            </h1>
            <p className="mt-4 font-mono text-sm text-gray-600">
              {errorMsg}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => navigate("/bookings/recurring")}
                className="border-2 border-black bg-black px-6 py-3 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black transition-colors"
              >
                Back to Recurring Bookings
              </button>
            </div>
          </>
        )}

      </div>
    </main>
  );
}