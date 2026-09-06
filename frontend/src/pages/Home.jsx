import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

const ZONE_RATES = [
  { label: "Sector 1 (Premium) - $4.50/hr", value: 4.5 },
  { label: "Sector 2 (Standard) - $3.00/hr", value: 3.0 },
  { label: "Sector 3 (Economy) - $2.00/hr", value: 2.0 },
];

const DURATIONS = [
  { label: "1 Hour", value: 1 },
  { label: "2 Hours", value: 2 },
  { label: "4 Hours", value: 4 },
  { label: "8 Hours (Day)", value: 8 },
  { label: "24 Hours (Overnight)", value: 24 },
];

const TOTAL_BAYS = 16;

function randomBayState() {
  const r = Math.random();
  if (r < 0.2) return "occupied";
  if (r < 0.4) return "reserved";
  return "open";
}

function bayClasses(state) {
  if (state === "occupied") return "bg-ink text-bgBase";
  if (state === "reserved") return "bg-highlight";
  return "bg-transparent";
}

function EyeIcon({ crossed }) {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="2"
      strokeLinecap="square"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
      {crossed && <line x1="2" y1="2" x2="22" y2="22"></line>}
    </svg>
  );
}

function Home() {
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();

  useEffect(() => {
    document.title = "ZENO";
  }, []);

  /* ---------- Rate Estimator ---------- */
  const [zoneRate, setZoneRate] = useState(ZONE_RATES[0].value);
  const [duration, setDuration] = useState(DURATIONS[1].value);
  const total = (zoneRate * duration).toFixed(2);

  /* ---------- Capability Visualizer ---------- */
  const [activeViz, setActiveViz] = useState("viz-grid");
  const [routeKey, setRouteKey] = useState(0);

  const switchViz = (target) => {
    setActiveViz((prev) => {
      if (prev === target) return prev;
      if (target === "viz-route") setRouteKey((k) => k + 1);
      return target;
    });
  };

  const specs = [
    {
      id: "viz-grid",
      title: "Live Spatial Mapping",
      body: "The floor plan interface distinguishes instantaneously between available, occupied, and locked states, eradicating the need for physical bay verification.",
    },
    {
      id: "viz-route",
      title: "Precision Routing Engine",
      body: "Geospatial logic computes optimal trajectories from facility entry to the exact reserved coordinate, mitigating internal congestion and aimless navigation.",
    },
    {
      id: "viz-txn",
      title: "Automated Settlement & Overstay",
      body: "Instant digital receipts for every payment. If you need to stay longer, fair automatic charges are applied without any gate disputes or manual tickets.",
    },
  ];

  /* ---------- Live Grid Simulator ---------- */
  const [bays, setBays] = useState(() =>
    Array.from({ length: TOTAL_BAYS }, () => randomBayState())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setBays((prev) => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * TOTAL_BAYS);
        next[idx] = randomBayState();
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  /* ---------- Transaction Simulator ---------- */
  const [txnSettled, setTxnSettled] = useState(false);

  useEffect(() => {
    if (activeViz !== "viz-txn") return;
    const interval = setInterval(() => {
      setTxnSettled((prev) => {
        if (!prev) {
          setTimeout(() => setTxnSettled(false), 3000);
          return true;
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [activeViz]);

  /* ---------- Scroll progress + step reveal ---------- */
  const flowContainerRef = useRef(null);
  const progressLineRef = useRef(null);
  const [stepsVisible, setStepsVisible] = useState([false, false, false]);
  const stepRefs = [useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    const onScroll = () => {
      const container = flowContainerRef.current;
      const line = progressLineRef.current;
      if (!container || !line) return;

      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      let progress = 0;

      if (rect.top < windowHeight / 2) {
        const totalDist = rect.height;
        const scrolledDist = windowHeight / 2 - rect.top;
        progress = Math.min(1, Math.max(0, scrolledDist / totalDist));
      }
      line.style.transform = `scaleY(${progress})`;
    };

    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      setStepsVisible([true, true, true]);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = stepRefs.findIndex((r) => r.current === entry.target);
          if (idx === -1) return;
          if (entry.isIntersecting) {
            setStepsVisible((prev) => {
              const next = [...prev];
              next[idx] = true;
              return next;
            });
          }
        });
      },
      { threshold: 0.5 }
    );
    stepRefs.forEach((r) => r.current && observer.observe(r.current));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Auth widget ---------- */
  const [authMode, setAuthMode] = useState("login");
  const [authData, setAuthData] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleAuthChange = (e) => {
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  const switchAuthTab = (mode) => {
    setAuthMode(mode);
    setAuthError("");
    setAuthNotice("");
    setShowPass(false);
    setShowConfirm(false);
    setAuthData({ name: "", email: "", password: "", confirm: "" });
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthNotice("");

    if (authMode === "signup" && authData.password !== authData.confirm) {
      setAuthError("Passwords do not match.");
      return;
    }

    setAuthSubmitting(true);
    try {
      if (authMode === "login") {
        const res = await API.post("/auth/login", {
          email: authData.email,
          password: authData.password,
        });
        login(res.data.user, res.data.token);
        setAuthNotice("ACCESS_GRANTED");
        setAuthData({ name: "", email: "", password: "", confirm: "" });
        navigate("/dashboard");
      } else {
        await API.post("/auth/register", {
          name: authData.name,
          email: authData.email,
          password: authData.password,
        });
        setAuthNotice("ACCOUNT_CREATED \u2014 please log in.");
        setAuthMode("login");
        setAuthData({ name: "", email: "", password: "", confirm: "" });
      }
    } catch (err) {
      setAuthError(
        err.response?.data?.message ||
          (authMode === "login" ? "Login failed." : "Registration failed.")
      );
    } finally {
      setAuthSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* ================= HERO ================= */}
      <section className="border-b-4 border-ink relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[70vh]">
          {/* Main Value Prop */}
          <div className="lg:col-span-8 p-8 md:p-16 flex flex-col justify-center relative z-10 border-b-2 lg:border-b-0 lg:border-r-2 border-ink bg-bgBase">
            <div className="mb-12">
              <span className="inline-block border border-ink px-2 py-1 font-mono text-xs font-bold uppercase tracking-widest mb-6">
                Version 2.0 / Stable
              </span>
              <h1 className="font-display text-6xl md:text-8xl lg:text-[7rem] font-bold tracking-tighter leading-[0.85] uppercase">
                Parking, <br />
                Managed <br />
                Properly.
              </h1>
            </div>

            <div className="max-w-xl font-mono text-sm md:text-base text-inkMuted space-y-4">
              <p className="border-l-2 border-alert pl-4">
                Replacing manual workflows and fragmented spreadsheets with a
                centralized, deterministic digital platform for building
                infrastructure.
              </p>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-4">
              <Link
                to="/slots/browse"
                className="border-2 border-ink bg-transparent text-ink px-8 py-4 font-mono font-bold uppercase tracking-widest hover:bg-ink hover:text-bgBase flex items-center group transition-colors"
              >
                Find a Space
                <svg
                  className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    strokeWidth="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  ></path>
                </svg>
              </Link>
              {user && (
                <Link
                  to="/dashboard"
                  className="border-2 border-ink bg-ink text-bgBase px-8 py-4 font-mono font-bold uppercase tracking-widest hover:bg-highlight hover:text-ink flex items-center group transition-colors shadow-[4px_4px_0px_0px_rgba(17,17,17,0.3)]"
                >
                  Dashboard
                  <svg
                    className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      strokeWidth="2"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    ></path>
                  </svg>
                </Link>
              )}
            </div>
          </div>

          {/* Rate Estimator */}
          <div className="lg:col-span-4 bg-ink text-bgBase p-6 flex flex-col font-mono text-xs h-full relative">
            <div className="border-b border-inkMuted pb-4 mb-4 flex justify-between items-center">
              <span className="text-inkMuted uppercase">Rate Estimator</span>
              <span className="flex items-center text-safe">
                <span className="w-2 h-2 bg-safe mr-2 animate-blink"></span>{" "}
                CLIENT-SIDE
              </span>
            </div>

            <form
              className="space-y-4 mb-6 z-10 relative"
              onSubmit={(e) => e.preventDefault()}
            >
              <div>
                <label className="block text-inkMuted mb-1 uppercase tracking-wider">
                  Facility Zone
                </label>
                <select
                  value={zoneRate}
                  onChange={(e) => setZoneRate(parseFloat(e.target.value))}
                  className="w-full bg-transparent border border-inkMuted p-2 text-bgBase focus:outline-none focus:border-highlight appearance-none font-sans"
                >
                  {ZONE_RATES.map((z) => (
                    <option
                      key={z.value}
                      value={z.value}
                      className="text-ink bg-bgBase"
                    >
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-inkMuted mb-1 uppercase tracking-wider">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseFloat(e.target.value))}
                  className="w-full bg-transparent border border-inkMuted p-2 text-bgBase focus:outline-none focus:border-highlight appearance-none font-sans"
                >
                  {DURATIONS.map((d) => (
                    <option
                      key={d.value}
                      value={d.value}
                      className="text-ink bg-bgBase"
                    >
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-8 border-t border-inkMuted border-dashed pt-4 flex justify-between items-end">
                <span className="text-inkMuted uppercase tracking-widest text-[10px]">
                  Estimated Total
                </span>
                <span className="font-display text-4xl text-highlight font-bold">
                  ${total}
                </span>
              </div>
            </form>

            <div className="mt-auto z-10 relative">
              <div className="border border-inkMuted p-3 text-inkMuted text-[10px] leading-relaxed">
                [SYS_NOTE] Output is a sandbox estimation. Live matrix rates
                vary dynamically based on localized building demand and owner
                configuration telemetry.
              </div>
            </div>

            <div
              className="absolute inset-0 pointer-events-none opacity-20 z-0"
              style={{
                background:
                  "linear-gradient(transparent 50%, rgba(0,0,0,0.25) 50%)",
                backgroundSize: "100% 4px",
              }}
            ></div>
          </div>
        </div>
      </section>

      {/* ================= PROTOCOL ================= */}
      <section id="protocol" className="border-b-4 border-ink">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y-2 md:divide-y-0 md:divide-x-2 divide-ink">
          {/* Legacy */}
          <div className="p-8 md:p-16 bg-bgAlt">
            <div className="font-mono text-sm font-bold border-b border-ink pb-2 mb-8 flex justify-between uppercase">
              <span>Framework: Legacy</span>
              <span className="text-alert">Status: Deprecated</span>
            </div>
            <h2 className="font-display text-4xl font-bold tracking-tight mb-8">
              Systemic Friction
            </h2>
            <ul className="space-y-6 font-sans">
              <li className="grid grid-cols-specs items-start gap-4">
                <span className="font-mono text-xs text-inkMuted border border-inkMuted px-1 py-0.5 mt-1 inline-block text-center">
                  ERR_CONFLICT
                </span>
                <span className="text-sm">
                  Asynchronous offline spreadsheets lead directly to physical
                  double-bookings and tenant disputes.
                </span>
              </li>
              <li className="grid grid-cols-specs items-start gap-4">
                <span className="font-mono text-xs text-inkMuted border border-inkMuted px-1 py-0.5 mt-1 inline-block text-center">
                  ERR_OPACITY
                </span>
                <span className="text-sm">
                  Zero real-time visibility into inventory. Tenants must
                  visually patrol floors to locate available bays.
                </span>
              </li>
              <li className="grid grid-cols-specs items-start gap-4">
                <span className="font-mono text-xs text-inkMuted border border-inkMuted px-1 py-0.5 mt-1 inline-block text-center">
                  ERR_LEAKAGE
                </span>
                <span className="text-sm">
                  Manual cash handling and disparate ledger tracking results
                  in revenue leakage and auditing complexities.
                </span>
              </li>
            </ul>
          </div>

          {/* Protocol */}
          <div className="p-8 md:p-16 bg-bgBase">
            <div className="font-mono text-sm font-bold border-b border-ink pb-2 mb-8 flex justify-between uppercase">
              <span>Framework: ZENO</span>
              <span className="text-safe">Status: Active</span>
            </div>
            <h2 className="font-display text-4xl font-bold tracking-tight mb-8">
              Unified State
            </h2>
            <div className="space-y-6 text-sm font-sans">
              <p className="leading-relaxed">
                ZENO introduces a deterministic, state-driven environment.
                Inventory is live, payments are strictly digital, and rule
                enforcement is executed programmatically.
              </p>
              <p className="leading-relaxed">
                By establishing a single source of truth, administrators
                regain architectural oversight, owners maximize asset yield
                without manual intervention, and renters experience
                frictionless access handled entirely through a structured web
                interface.
              </p>
            </div>

            <div className="mt-12 border border-ink p-4 grid grid-cols-3 gap-2">
              <div className="h-2 bg-ink"></div>
              <div className="h-2 bg-safe"></div>
              <div className="h-2 border border-ink"></div>
              <div className="col-span-3 font-mono text-[10px] text-inkMuted uppercase text-right mt-1">
                State Transition Map v1.0
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= WHO IT'S FOR ================= */}
      <section className="border-b-4 border-ink">
        <div className="bg-ink text-bgBase px-8 py-4 border-b-2 border-ink">
          <h2 className="font-mono font-bold uppercase tracking-widest text-sm">
            Who It's For
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-ink bg-bgBase">
          <div className="p-8 group hover:bg-bgAlt">
            <div className="font-mono text-5xl font-light text-inkMuted mb-6 group-hover:text-ink">
              01
            </div>
            <h3 className="font-display text-2xl font-bold mb-2 uppercase">
              Facility Admins
            </h3>
            <div className="font-mono text-xs text-ink font-bold border-b border-ink pb-4 mb-6 uppercase tracking-wider">
              Output: Total Oversight
            </div>
            <p className="text-sm leading-relaxed mb-6">
              Eliminate dispute resolution overhead. Maintain control over
              facility access, configure parking parameters, and rely on
              secure records for every booking within the building.
            </p>
          </div>

          <div className="p-8 group hover:bg-bgAlt">
            <div className="font-mono text-5xl font-light text-inkMuted mb-6 group-hover:text-ink">
              02
            </div>
            <h3 className="font-display text-2xl font-bold mb-2 uppercase">
              Parking Owners
            </h3>
            <div className="font-mono text-xs text-ink font-bold border-b border-ink pb-4 mb-6 uppercase tracking-wider">
              Output: Yield Automation
            </div>
            <p className="text-sm leading-relaxed mb-6">
              Transform empty spaces into income. Set custom pricing based on
              demand or time-of-day. The platform handles booking, payments,
              and invoicing while you monitor your earnings.
            </p>
          </div>

          <div className="p-8 group hover:bg-bgAlt">
            <div className="font-mono text-5xl font-light text-inkMuted mb-6 group-hover:text-ink">
              03
            </div>
            <h3 className="font-display text-2xl font-bold mb-2 uppercase">
              End Renters
            </h3>
            <div className="font-mono text-xs text-ink font-bold border-b border-ink pb-4 mb-6 uppercase tracking-wider">
              Output: Deterministic Access
            </div>
            <p className="text-sm leading-relaxed mb-6">
              Find available spots instantly. Secure reservations with
              immediate digital payment, get precise turn-by-turn routing to
              your space, and manage monthly parking easily.
            </p>
          </div>
        </div>
      </section>

      {/* ================= CAPABILITIES ================= */}
      <section
        id="capabilities"
        className="border-b-4 border-ink flex flex-col md:flex-row"
      >
        {/* Specs */}
        <div className="w-full md:w-1/2 lg:w-2/5 border-r-2 border-ink flex flex-col bg-bgBase z-10 relative">
          <div className="sticky top-[72px]">
            <div className="bg-ink text-bgBase px-8 py-4 border-b-2 border-ink">
              <h2 className="font-mono font-bold uppercase tracking-widest text-sm">
                How ZENO Works
              </h2>
            </div>

            <div className="divide-y-2 divide-ink">
              {specs.map((spec) => (
                <div
                  key={spec.id}
                  className={`p-8 cursor-crosshair transition-none ${
                    activeViz === spec.id
                      ? "bg-ink text-bgBase"
                      : "hover:bg-bgAlt"
                  }`}
                  onMouseEnter={() => switchViz(spec.id)}
                  onClick={() => switchViz(spec.id)}
                >
                  <h4 className="font-display text-xl font-bold uppercase mb-2">
                    {spec.title}
                  </h4>
                  <p className="text-sm font-sans">{spec.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visualizer */}
        <div className="w-full md:w-1/2 lg:w-3/5 bg-bgAlt min-h-[500px] flex items-center justify-center p-8 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          ></div>

          {/* VIZ 1: Grid */}
          <div
            className={`w-full max-w-md absolute transition-opacity duration-300 ${
              activeViz === "viz-grid"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="border-2 border-ink bg-bgBase p-4 font-mono uppercase">
              <div className="flex justify-between items-center border-b-2 border-ink pb-2 mb-4 text-xs font-bold">
                <span>Sector_7G</span>
                <span>Live Array</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {bays.map((state, i) => (
                  <div
                    key={i}
                    className={`w-full aspect-square border border-ink flex items-center justify-center text-[10px] ${bayClasses(
                      state
                    )}`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex space-x-4 text-[10px] border-t-2 border-ink pt-2">
                <span className="flex items-center">
                  <div className="w-3 h-3 border border-ink mr-1 bg-transparent"></div>{" "}
                  Open
                </span>
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-highlight border border-ink mr-1"></div>{" "}
                  Rsrvd
                </span>
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-ink mr-1"></div> Occpd
                </span>
              </div>
            </div>
          </div>

          {/* VIZ 2: Route */}
          <div
            className={`w-full max-w-md absolute transition-opacity duration-300 ${
              activeViz === "viz-route"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="border-2 border-ink bg-bgBase p-4 font-mono uppercase">
              <div className="flex justify-between items-center border-b-2 border-ink pb-2 mb-4 text-xs font-bold">
                <span>Nav_Vector</span>
                <span className="text-safe animate-blink-fast">Tracking</span>
              </div>
              <div className="relative h-48 bg-bgAlt border border-ink p-4 flex items-center justify-center">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 300 150"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M50 20 L250 20 L250 130"
                    stroke="#111"
                    strokeWidth="2"
                    strokeOpacity="0.2"
                  />
                  <path
                    d="M50 75 L200 75 L200 130"
                    stroke="#111"
                    strokeWidth="2"
                    strokeOpacity="0.2"
                  />
                  <path
                    key={routeKey}
                    d="M20 130 L100 130 L100 50 L250 50"
                    stroke="#C34222"
                    strokeWidth="4"
                    strokeDasharray="8 8"
                    className={`route-path ${
                      activeViz === "viz-route" ? "active" : ""
                    }`}
                  />
                  <rect x="10" y="120" width="20" height="20" fill="#111" />
                  <text
                    x="12"
                    y="115"
                    fontFamily="monospace"
                    fontSize="10"
                    fill="#111"
                  >
                    ENTRY
                  </text>
                  <circle cx="250" cy="50" r="8" fill="#3A5A40" />
                  <text
                    x="235"
                    y="35"
                    fontFamily="monospace"
                    fontSize="10"
                    fill="#111"
                  >
                    BAY_42
                  </text>
                </svg>
              </div>
            </div>
          </div>

          {/* VIZ 3: Transaction */}
          <div
            className={`w-full max-w-md absolute transition-opacity duration-300 ${
              activeViz === "viz-txn"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="border-2 border-ink bg-bgBase font-mono uppercase text-sm">
              <div className="bg-ink text-bgBase p-2 flex justify-between">
                <span>LEDGER_TKT</span>
                <span>#TXN-9981</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between border-b border-ink border-dashed pb-2">
                  <span>Base Rate (4H)</span>
                  <span>$12.00</span>
                </div>
                <div className="flex justify-between border-b border-ink border-dashed pb-2 text-alert">
                  <span>Overstay (+45M)</span>
                  <span className="animate-blink">$15.00</span>
                </div>
                <div className="flex justify-between font-bold pt-2 text-lg">
                  <span>TOTAL</span>
                  <span>$27.00</span>
                </div>

                <div
                  className={`mt-6 border-2 border-ink p-2 text-center relative overflow-hidden ${
                    txnSettled ? "bg-safe text-bgBase" : "bg-bgAlt"
                  }`}
                >
                  <div className="font-bold tracking-widest">
                    {txnSettled ? "SETTLED_OK" : "AWAITING_SETTLEMENT"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW TO PARK ================= */}
      <section className="border-b-4 border-ink bg-bgBase py-16 relative">
        <div className="max-w-4xl mx-auto px-8 relative">
          <h2 className="font-display text-4xl font-bold tracking-tight mb-16 text-center uppercase">
            How to Park with ZENO
          </h2>

          <div className="absolute left-8 md:left-1/2 top-32 bottom-0 w-[2px] bg-ink/10 -translate-x-1/2 z-0 hidden md:block">
            <div
              ref={progressLineRef}
              className="absolute top-0 left-0 w-full bg-ink origin-top scale-y-0 transition-transform duration-100"
            ></div>
          </div>

          <div
            className="space-y-12 md:space-y-24 relative z-10"
            ref={flowContainerRef}
          >
            {/* Step 1 */}
            <div
              ref={stepRefs[0]}
              className={`flex flex-col md:flex-row items-center md:justify-between transition-opacity duration-500 ${
                stepsVisible[0] ? "opacity-100" : "opacity-50"
              }`}
            >
              <div className="w-full md:w-5/12 text-left md:text-right mb-4 md:mb-0 pr-0 md:pr-8">
                <h4 className="font-display text-2xl font-bold uppercase">
                  Search
                </h4>
                <p className="text-sm mt-2">
                  Enter your destination and schedule. Browse real-time
                  availability in nearby supported buildings with clear
                  hourly rates.
                </p>
              </div>
              <div className="w-12 h-12 bg-bgBase border-4 border-ink flex items-center justify-center font-mono font-bold text-xl flex-shrink-0 z-10">
                01
              </div>
              <div className="w-full md:w-5/12 pl-0 md:pl-8 mt-4 md:mt-0 opacity-80">
                <div className="border-2 border-ink p-4 bg-bgAlt font-mono text-sm flex flex-col space-y-2">
                  <div className="flex justify-between border-b border-ink border-dashed pb-2">
                    <span>Target:</span> <span className="font-bold">711 Oakhaven</span>
                  </div>
                  <div className="flex justify-between border-b border-ink border-dashed pb-2">
                    <span>Arrive:</span> <span className="font-bold">14:00</span>
                  </div>
                  <div className="flex justify-between text-safe font-bold">
                    <span>Found:</span> <span>3 Slots Available</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              ref={stepRefs[1]}
              className={`flex flex-col md:flex-row-reverse items-center md:justify-between transition-opacity duration-500 ${
                stepsVisible[1] ? "opacity-100" : "opacity-50"
              }`}
            >
              <div className="w-full md:w-5/12 text-left mb-4 md:mb-0 pl-0 md:pl-8">
                <h4 className="font-display text-2xl font-bold uppercase">
                  Book &amp; Pay
                </h4>
                <p className="text-sm mt-2">
                  Select your spot to lock it in instantly. Checkout securely
                  within the platform—no cash, no waiting at ticket barriers.
                </p>
              </div>
              <div className="w-12 h-12 bg-bgBase border-4 border-ink flex items-center justify-center font-mono font-bold text-xl flex-shrink-0 z-10">
                02
              </div>
              <div className="w-full md:w-5/12 pr-0 md:pr-8 mt-4 md:mt-0 opacity-80">
                <div className="border-2 border-ink p-4 bg-bgAlt font-mono text-sm flex flex-col space-y-2 text-left md:ml-auto">
                  <div className="flex justify-between border-b border-ink border-dashed pb-2">
                    <span>Bay:</span> <span className="font-bold">42-B</span>
                  </div>
                  <div className="flex justify-between border-b border-ink border-dashed pb-2">
                    <span>Total:</span> <span className="font-bold">$12.00</span>
                  </div>
                  <div className="flex justify-between text-ink font-bold items-center">
                    <span>Status:</span>
                    <span className="bg-ink text-bgBase px-2 py-0.5 text-xs">
                      PAID_SECURE
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              ref={stepRefs[2]}
              className={`flex flex-col md:flex-row items-center md:justify-between transition-opacity duration-500 ${
                stepsVisible[2] ? "opacity-100" : "opacity-50"
              }`}
            >
              <div className="w-full md:w-5/12 text-left md:text-right mb-4 md:mb-0 pr-0 md:pr-8">
                <h4 className="font-display text-2xl font-bold uppercase">
                  Navigate &amp; Park
                </h4>
                <p className="text-sm mt-2">
                  Get precise, turn-by-turn routing directly to your specific
                  bay inside the building. Check out digitally when you
                  leave.
                </p>
              </div>
              <div className="w-12 h-12 bg-bgBase border-4 border-ink flex items-center justify-center font-mono font-bold text-xl flex-shrink-0 z-10">
                03
              </div>
              <div className="w-full md:w-5/12 pl-0 md:pl-8 mt-4 md:mt-0 opacity-80">
                <div className="border-2 border-ink p-4 bg-bgAlt font-mono text-sm flex flex-col items-center justify-center space-y-2 relative overflow-hidden h-[104px]">
                  <div className="absolute inset-0 bg-safe/10"></div>
                  <svg
                    className="w-8 h-8 text-safe mb-1 z-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span className="font-bold text-safe uppercase tracking-widest z-10">
                    Access Granted
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUST ================= */}
      <section className="border-b-4 border-ink bg-ink text-bgBase px-8 py-12 md:py-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight mb-6 text-bgBase">
              Trusted Infrastructure
            </h2>
            <p className="font-mono text-sm text-inkMuted mb-8 leading-relaxed">
              ZENO is engineered for uncompromised reliability. System state
              relies on strict relational logic and secure paradigms,
              ensuring operation stability and data protection for both
              building owners and renters.
            </p>
            <div className="grid grid-cols-2 gap-4 font-mono text-xs font-bold uppercase">
              <div className="border border-bgAlt p-3 flex flex-col hover:bg-bgBase/5">
                <span className="text-safe mb-1">■ Active</span>
                <span>Secure Encrypted Payments</span>
              </div>
              <div className="border border-bgAlt p-3 flex flex-col hover:bg-bgBase/5">
                <span className="text-safe mb-1">■ Active</span>
                <span>Verified Building Access</span>
              </div>
              <div className="border border-bgAlt p-3 flex flex-col hover:bg-bgBase/5">
                <span className="text-safe mb-1">■ Active</span>
                <span>Automated Dispute Resolution</span>
              </div>
              <div className="border border-bgAlt p-3 flex flex-col hover:bg-bgBase/5">
                <span className="text-safe mb-1">■ Active</span>
                <span>Cancel Free Within 1 Hour</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
            <div className="border-2 border-bgBase p-6 text-sm bg-bgBase text-ink relative overflow-hidden flex flex-col justify-between">
              <div className="text-safe mb-4 font-bold text-xs flex items-center uppercase">
                <span className="w-2 h-2 bg-safe mr-2 animate-blink-fast"></span>{" "}
                Always Available
              </div>
              <h4 className="font-bold text-xl uppercase mb-2">Book 24/7</h4>
              <p className="text-inkMuted text-xs">
                Find and reserve parking at any hour, day or night.
              </p>
            </div>
            <div className="border-2 border-inkMuted p-6 text-sm bg-transparent relative overflow-hidden flex flex-col justify-between">
              <div className="text-inkMuted mb-4 font-bold text-xs flex items-center uppercase">
                <span className="w-2 h-2 border border-inkMuted mr-2"></span>{" "}
                Operations
              </div>
              <h4 className="font-bold text-xl uppercase mb-2">
                24/7 Support
              </h4>
              <p className="text-inkMuted text-xs">
                Dedicated administrative assistance for facility managers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= AUTH ================= */}
      <section id="auth" className="bg-bgAlt py-20 px-8">
        {user ? (
          <div className="max-w-md mx-auto border-4 border-ink bg-bgBase shadow-[8px_8px_0px_0px_rgba(17,17,17,1)]">
            <div className="bg-ink text-bgBase px-4 py-2 font-mono text-xs uppercase font-bold flex justify-between items-center">
              <span>ACTIVE_SESSION</span>
              <span className="flex items-center space-x-1 text-safe">
                <span className="w-2 h-2 bg-safe mr-1 animate-blink"></span> ONLINE
              </span>
            </div>

            <div className="p-8 md:p-10 font-mono">
              <div className="border-2 border-safe bg-safe/10 text-safe font-bold uppercase text-xs px-3 py-2 mb-6">
                [AUTH_ACTIVE] Currently logged in as {user.name}
              </div>

              <div className="space-y-3 text-xs mb-8">
                <div className="flex justify-between border-b border-ink/20 pb-2">
                  <span className="text-inkMuted uppercase">Operator:</span>
                  <span className="font-bold">{user.name}</span>
                </div>
                <div className="flex justify-between border-b border-ink/20 pb-2">
                  <span className="text-inkMuted uppercase">Email:</span>
                  <span className="font-bold">{user.email}</span>
                </div>
                <div className="flex justify-between border-b border-ink/20 pb-2">
                  <span className="text-inkMuted uppercase">Role:</span>
                  <span className="font-bold uppercase text-alert">{user.role || "User"}</span>
                </div>
              </div>

              <Link
                to="/dashboard"
                className="w-full bg-ink text-bgBase font-bold uppercase p-4 hover:bg-highlight hover:text-ink border-2 border-ink flex items-center justify-center group mb-3 transition-colors text-sm"
              >
                Go to Dashboard
                <svg
                  className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    strokeWidth="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  ></path>
                </svg>
              </Link>

              <button
                type="button"
                onClick={logout}
                className="w-full border-2 border-ink p-3 hover:bg-alert hover:text-bgBase uppercase font-bold text-xs transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto border-4 border-ink bg-bgBase shadow-[8px_8px_0px_0px_rgba(17,17,17,1)]">
          <div className="bg-ink text-bgBase px-4 py-2 font-mono text-xs uppercase font-bold flex justify-between">
            <span>ACCOUNT_ACCESS</span>
            <span className="flex space-x-2">
              <div className="w-3 h-3 border border-bgBase"></div>
              <div className="w-3 h-3 border border-bgBase"></div>
              <div className="w-3 h-3 bg-bgBase"></div>
            </span>
          </div>

          <div className="flex border-b-2 border-ink font-mono text-sm font-bold uppercase cursor-pointer">
            <div
              className={`w-1/2 p-4 text-center border-r-2 border-ink ${
                authMode === "login"
                  ? "bg-ink text-bgBase"
                  : "hover:bg-bgAlt"
              }`}
              onClick={() => switchAuthTab("login")}
            >
              Log In
            </div>
            <div
              className={`w-1/2 p-4 text-center ${
                authMode === "signup"
                  ? "bg-ink text-bgBase"
                  : "hover:bg-bgAlt"
              }`}
              onClick={() => switchAuthTab("signup")}
            >
              Sign Up
            </div>
          </div>

          <div className="p-8 md:p-10">
            <form onSubmit={handleAuthSubmit} className="space-y-5 font-mono text-sm">
              {authMode === "signup" && (
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={authData.name}
                    onChange={handleAuthChange}
                    placeholder="Jane Doe"
                    className="border-2 border-ink bg-transparent p-3 focus:outline-none focus:bg-ink focus:text-bgBase placeholder-inkMuted"
                  />
                </div>
              )}

              <div className="flex flex-col">
                <label className="uppercase font-bold mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={authData.email}
                  onChange={handleAuthChange}
                  placeholder="name@domain.com"
                  className="border-2 border-ink bg-transparent p-3 focus:outline-none focus:bg-ink focus:text-bgBase placeholder-inkMuted"
                />
              </div>

              <div className="flex flex-col">
                <label className="uppercase font-bold mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    name="password"
                    required
                    minLength={8}
                    value={authData.password}
                    onChange={handleAuthChange}
                    placeholder="••••••••"
                    className="peer w-full border-2 border-ink bg-transparent p-3 pr-10 focus:outline-none focus:bg-ink focus:text-bgBase placeholder-inkMuted"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink peer-focus:text-bgBase hover:text-highlight focus:outline-none"
                    onClick={() => setShowPass((v) => !v)}
                  >
                    <EyeIcon crossed={showPass} />
                  </button>
                </div>
              </div>

              {authMode === "signup" && (
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      name="confirm"
                      required
                      value={authData.confirm}
                      onChange={handleAuthChange}
                      placeholder="••••••••"
                      className="peer w-full border-2 border-ink bg-transparent p-3 pr-10 focus:outline-none focus:bg-ink focus:text-bgBase placeholder-inkMuted"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink peer-focus:text-bgBase hover:text-highlight focus:outline-none"
                      onClick={() => setShowConfirm((v) => !v)}
                    >
                      <EyeIcon crossed={showConfirm} />
                    </button>
                  </div>
                </div>
              )}

              {authError && (
                <div className="border-2 border-alert text-alert font-bold uppercase text-xs px-3 py-2">
                  [ERR] {authError}
                </div>
              )}
              {authNotice && !authError && (
                <div className="border-2 border-safe text-safe font-bold uppercase text-xs px-3 py-2">
                  [OK] {authNotice}
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full bg-ink text-bgBase font-bold uppercase p-4 hover:bg-highlight hover:text-ink border-2 border-ink mt-2 disabled:opacity-60"
              >
                {authSubmitting
                  ? ">[PROCESSING...]"
                  : authMode === "login"
                  ? "Log In"
                  : "Sign Up"}
              </button>
            </form>

            <div className="my-8 relative flex items-center justify-center">
              <div className="absolute w-full border-t border-ink/30"></div>
              <div className="bg-bgBase px-4 relative z-10 font-mono text-xs text-inkMuted uppercase font-bold">
                Or continue with
              </div>
            </div>

            <div className="space-y-3 font-mono text-sm uppercase font-bold">
              <button className="w-full border-2 border-ink p-3 hover:bg-bgAlt flex items-center justify-center text-ink">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-3">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                </svg>
                Google
              </button>
              <button className="w-full border-2 border-ink p-3 hover:bg-bgAlt flex items-center justify-center text-ink">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-3">
                  <path d="M19,4V7H17A1,1,0,0,0,16,8v2h3s-0.146,1.481-0.428,3H16v8H12V13H10V10h2V7.472C12,5.293,13.242,4,15.714,4H19Z" />
                </svg>
                Facebook
              </button>
              <button className="w-full border-2 border-ink p-3 hover:bg-bgAlt flex items-center justify-center text-ink">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  className="w-5 h-5 mr-3"
                >
                  <rect x="5" y="2" width="14" height="20"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
                Phone
              </button>
            </div>
          </div>
        </div>
      )}
      </section>
    </Layout>
  );
}

export default Home;
