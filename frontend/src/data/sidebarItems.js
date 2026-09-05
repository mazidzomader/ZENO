export const sidebarItems = [
  {
    id: "admin",
    title: "Admin Panel",
    icon: "Shield",
    path: "/admin",
    roles: ["admin"], // only visible to admin
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard"
  },

  {
    id: "browseslots",
    title: "Browse Slots",
    icon: "Search",
    path: "/slots/browse",
    roles: ["renter"], // only visible to renter
  },

  {
    id: "vehicles",
    title: "Vehicles",
    icon: "Car",
    path: "/collections/vehicles"
  },
    {
    id: "buildings",
    title: "Buildings",
    icon: "Building",
    path: "/slots/mine",
    roles: ["owner", "admin"], // now points to the My Slots page
  },
  {
    id: "pricingrules",
    title: "Pricing Rules",
    icon: "Tag",
    path: "/pricing-rules",
    roles: ["owner", "admin"],
  },
  {
    id: "bookings",
    title: "My Bookings",
    icon: "Calendar",
    path: "/bookings/history",
    roles: ["renter", "admin"], // a renter's own reservations
  },
  {
    id: "owner-bookings",
    title: "Slot Bookings",
    icon: "Calendar",
    path: "/bookings/owner",
    roles: ["owner"], // who's renting the owner's slots
  },
  {
    id: "navigation",
    title: "Navigation",
    icon: "Map",
    path: "/navigation"
  },
  {
    id: "checkinouts",
    title: "Check-in/outs",
    icon: "ClipboardCheck",
    path: "/collections/checkinouts"
  },
  {
    id: "overstaypenalties",
    title: "Overstay Penalties",
    icon: "AlertTriangle",
    path: "/collections/overstaypenalties"
  },
  {
    id: "cancellationrefunds",
    title: "Cancellation and Refunds",
    icon: "Undo2",
    path: "/collections/cancellationrefunds"
  },
  {
    id: "invoices-view",
    title: "Invoice Viewer",
    icon: "Receipt",
    path: "/invoices"
  },
  {
    id: "payments",
    title: "Payments",
    icon: "CreditCard",
    path: "/payments"
  },

  {
    id: "subscriptions",
    title: "Subscriptions",
    icon: "KeyRound",
    path: "/subscriptions"
  },
  {
    id: "reviews",
    title: "Ratings & Reviews",
    icon: "Star",
    path: "/reviews"
  },
  {
    id: "reports",
    title: "Reports",
    icon: "BarChart3",
    path: "/collections/reports"
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: "Bell",
    path: "/notifications"
  },
  {
    id: "prelude",
    title: "Prelude",
    icon: "Database",
    path: "/collections/prelude"
  }
];
