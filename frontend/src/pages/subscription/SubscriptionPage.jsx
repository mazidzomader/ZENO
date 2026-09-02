// ZENO — Subscription Plans Page
// Route: /subscription (inside DashboardLayout)
// Standalone — does NOT modify any other page

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";

const PLAN_ORDER = ["basic", "pro", "premium"];

function HoursBar({ used, total }) {
  const pct = Math.min(100, (used / total) * 100);
  const remaining = Math.max(0, total - used);
  const color =
    pct >= 90 ? "bg-red-600" : pct >= 70 ? "bg-yellow-500" : "bg-black";

  return (
    <div className="mt-4">
      <div className="flex justify-between font-mono text-xs font-bold uppercase mb-1">
        <span>{remaining.toFixed(1)}h remaining</span>
        <span>{used.toFixed(1)} / {total}h used</span>
      </div>
      <div className="h-3 w-full border-2 border-black bg-white">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PlanCard({ plan, subscription, onSubscribe, onCancel, subscribing, cancelling }) {
  const isActive = subscription?.planId === plan.id && subscription?.status === "active";
  const hasAnyActive = !!subscription && subscription.status === "active";

  return (
    <div
      className={`border-4 border-black flex flex-col p-6 transition-colors ${
        isActive ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      {/* Badge */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className={`font-mono text-xs font-bold uppercase tracking-[0.3em] ${isActive ? "text-gray-400" : "text-gray-500"}`}>
            {plan.id === "pro" ? "Most Popular" : plan.id === "premium" ? "Best Value" : "Starter"}
          </p>
          <h2 className="mt-1 text-3xl font-black uppercase">{plan.name}</h2>
        </div>
        {isActive && (
          <span className="border-2 border-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest">
            Active
          </span>
        )}
      </div>

      {/* Price */}
      <div className="mb-4">
        <span className="text-5xl font-black">${plan.priceUsd}</span>
        <span className={`font-mono text-sm ml-1 ${isActive ? "text-gray-400" : "text-gray-500"}`}>/month</span>
      </div>

      {/* Hours highlight */}
      <div className={`border-2 ${isActive ? "border-white" : "border-black"} p-3 mb-4 text-center`}>
        <p className="font-mono text-xs uppercase tracking-widest opacity-70">Included</p>
        <p className="text-2xl font-black">{plan.hours}h <span className="text-sm font-mono font-normal">/ month</span></p>
      </div>

      {/* Perks */}
      <ul className="flex-grow space-y-2 mb-6">
        {plan.perks.map((perk) => (
          <li key={perk} className="flex items-center gap-2 font-mono text-xs">
            <span className={`font-black ${isActive ? "text-white" : "text-black"}`}>✓</span>
            {perk}
          </li>
        ))}
      </ul>

      {/* Hours bar — only on active plan */}
      {isActive && subscription && (
        <HoursBar used={subscription.hoursUsed} total={subscription.hoursTotal} />
      )}

      {/* Action Button */}
      <div className="mt-5">
        {isActive && (
          <button
            type="button"
            disabled={cancelling}
            onClick={onCancel}
            className="w-full border-2 border-white px-4 py-3 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel Subscription"}
          </button>
        )}
        {!isActive && !hasAnyActive && (
          <button
            type="button"
            disabled={subscribing === plan.id}
            onClick={() => onSubscribe(plan.id)}
            className="w-full border-2 border-black bg-black px-4 py-3 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
          >
            {subscribing === plan.id
              ? "Redirecting…"
              : `Subscribe — $${plan.priceUsd}/mo`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscribing, setSubscribing] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState("");
  const navigate = useNavigate();
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [plansRes, subRes] = await Promise.all([
        API.get("/subscriptions/plans"),
        API.get("/subscriptions/my"),
      ]);
      setPlans(
        PLAN_ORDER.map((id) =>
          plansRes.data.plans.find((p) => p.id === id)
        ).filter(Boolean)
      );
      setSubscription(subRes.data.subscription);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load subscription data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchData();
  }, [fetchData]);

  const handleSubscribe = async (planId) => {
    setSubscribing(planId);
    try {
      const res = await API.post("/subscriptions/subscribe", { planId });
      window.location.href = res.data.url;
    } catch (err) {
      alert(err.response?.data?.error || "Could not initiate subscription.");
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel your subscription? You will lose access immediately, but can subscribe again at any time.")) return;
    setCancelling(true);
    try {
      const res = await API.post("/subscriptions/cancel");
      setCancelMsg(res.data.message);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Could not cancel subscription.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <main className="p-6 md:p-10">
      {/* Header */}
      <header className="border-b-4 border-black pb-5">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">
          Feature — Subscriptions
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase md:text-6xl">
          Parking Plans
        </h1>
        <p className="mt-3 max-w-3xl font-mono text-sm">
          Subscribe to a monthly hour-pack. Use your hours when booking instead of paying per booking.
        </p>
      </header>

      {/* Cancel success message */}
      {cancelMsg && (
        <div className="mt-6 border-2 border-black bg-black text-white p-4 font-mono text-sm">
          {cancelMsg}
        </div>
      )}

      {/* Navigation */}
      <section className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate("/payments")}
          className="border-2 border-black bg-white px-5 py-3 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
        >
          ← Pay Bookings
        </button>
        <button
          type="button"
          onClick={() => navigate("/invoices")}
          className="border-2 border-black bg-white px-5 py-3 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
        >
          Invoices →
        </button>
      </section>

      {/* Loading */}
      {loading && (
        <div className="mt-10 border-2 border-dashed border-black p-10 text-center font-mono text-sm uppercase">
          Loading plans…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="mt-6 border-2 border-red-700 p-5 font-mono text-sm text-red-700">
          Error: {error}
        </div>
      )}

      {/* Plan Cards */}
      {!loading && !error && (
        <section className="mt-8 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              subscription={subscription}
              onSubscribe={handleSubscribe}
              onCancel={handleCancel}
              subscribing={subscribing}
              cancelling={cancelling}
            />
          ))}
        </section>
      )}

      {/* Fine print */}
      <p className="mt-10 font-mono text-xs text-gray-400 border-t border-gray-200 pt-4">
        Billed monthly via Stripe. Cancel anytime to immediately terminate your current subscription.
        Unused hours do not roll over.
      </p>
    </main>
  );
}
