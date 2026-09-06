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
    id: "vehicles",
    title: "Vehicles",
    icon: "Car",
    path: "/collections/vehicles"
  },
  {
    id: "browse-slots",
    title: "Browse Slots",
    icon: "Grid",
    path: "/slots/browse",
    roles: ["renter", "admin"], // renters browse & book available slots
  },
  {
    id: "my-slots",
    title: "My Slots",
    icon: "Grid",
    path: "/slots/mine",
    roles: ["owner", "admin"], // owners manage the slots they list
  },
  {
    id: "bookings",
    title: "Bookings",
    icon: "Calendar",
    path: "/bookings/history",
    roles: ["renter", "admin"], // a renter's own reservations
  },
  {
    id: "recurring-bookings",
    title: "Recurring Bookings",
    icon: "Repeat",
    path: "/bookings/recurring",
    roles: ["renter", "admin"],
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
    title: "Check-In / Check-Out",
    icon: "ClipboardCheck",
    path: "/checkinout"
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