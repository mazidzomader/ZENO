// ZENO — Subscription Cancel Landing Page
// Route: /subscription/cancel

import { useNavigate } from "react-router-dom";

export default function SubscriptionCancel() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-lg border-4 border-black p-10 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border-4 border-black text-3xl font-black text-gray-400">
          ←
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
          Checkout Cancelled
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase">No charge made</h1>
        <p className="mt-4 font-mono text-sm text-gray-600">
          You cancelled the subscription checkout. No payment was taken.
          You can subscribe anytime from the Plans page.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => navigate("/subscriptions")}
            className="border-2 border-black bg-black px-6 py-3 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black transition-colors"
          >
            Back to Plans →
          </button>
        </div>
      </div>
    </main>
  );
}
