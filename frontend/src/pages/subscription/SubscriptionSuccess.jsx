// ZENO — Subscription Success Landing Page
// Route: /subscription/success?session_id=cs_test_...

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../../services/api";

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  const [state, setState] = useState("verifying");
  const [subscription, setSubscription] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setErrorMsg("No session ID in URL.");
      return;
    }
    if (calledRef.current) return;
    calledRef.current = true;

    API.post("/subscriptions/verify", { sessionId })
      .then((res) => {
        if (res.data.success) {
          setSubscription(res.data.subscription);
          setState("success");
        } else {
          setState("error");
          setErrorMsg("Verification failed.");
        }
      })
      .catch((err) => {
        setState("error");
        setErrorMsg(err.response?.data?.error || "Could not verify subscription.");
      });
  }, [sessionId]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-lg border-4 border-black p-10 text-center">

        {/* Verifying */}
        {state === "verifying" && (
          <>
            <div className="mx-auto mb-6 h-12 w-12 animate-spin border-4 border-black border-t-transparent rounded-full" />
            <p className="font-mono text-sm font-bold uppercase tracking-widest">Activating subscription…</p>
          </>
        )}

        {/* Success */}
        {state === "success" && subscription && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border-4 border-black bg-black text-white text-3xl font-black">
              ✓
            </div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
              Subscription Active
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase">
              {subscription.planName} Plan!
            </h1>
            <p className="mt-4 font-mono text-sm text-gray-600">
              You now have <strong>{subscription.hoursTotal} hours</strong> of parking credit this month.
              Use them from the Payments page when booking.
            </p>

            {subscription.currentPeriodEnd && (
              <p className="mt-2 font-mono text-xs text-gray-400">
                Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => navigate("/payments")}
                className="border-2 border-black bg-black px-6 py-3 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black transition-colors"
              >
                Use Hours on Bookings →
              </button>
              <button
                type="button"
                onClick={() => navigate("/subscriptions")}
                className="border-2 border-black bg-white px-6 py-3 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
              >
                View My Plan
              </button>
            </div>
          </>
        )}

        {/* Error */}
        {state === "error" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border-4 border-black text-3xl font-black">✕</div>
            <h1 className="mt-3 text-4xl font-black uppercase">Activation Failed</h1>
            <p className="mt-4 font-mono text-sm text-gray-600">{errorMsg}</p>
            <button
              type="button"
              onClick={() => navigate("/subscriptions")}
              className="mt-8 border-2 border-black bg-black px-6 py-3 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black transition-colors"
            >
              Back to Plans
            </button>
          </>
        )}

      </div>
    </main>
  );
}
