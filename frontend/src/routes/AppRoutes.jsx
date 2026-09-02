import BrowseSlots from "../pages/slots/BrowseSlots";
import { Routes, Route, Navigate } from "react-router-dom";
import BookingHistory from "../pages/bookings/BookingHistory";

import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";

// Layout & Dynamic Database View
import DashboardLayout from "../layouts/DashboardLayout";
import { DatabaseCollectionView } from "../pages/DatabaseCollectionView";

// Feature 13 — Slot CRUD
import MySlots from "../pages/slots/MySlots";
import SlotForm from "../pages/slots/SlotForm";
import BulkSlotForm from "../pages/slots/BulkSlotForm";

// Feature 5 — Dynamic Pricing
import PricingRules from "../pages/pricing/PricingRules";
import PricingRuleForm from "../pages/pricing/PricingRuleForm";

// Feature 20 — Reports & Export
import Reports from "../pages/Reports";

// Feature 14 — Renter Profile & Vehicles
import VehicleManagement from "../pages/VehicleManagement";
//import ProtectedRoute from "../components/ProtectedRoute";

// Feature — Invoice Generation
import { InvoiceList, InvoiceView } from "../pages/InvoicePage";

import Dashboard from "../pages/Dashboard";
import ReviewsPage from "../pages/ReviewsPage";

// Feature — Stripe Payments (Isolated)
import PaymentsPage from "../pages/payment/PaymentsPage";
import PaymentSuccess from "../pages/payment/PaymentSuccess";
import PaymentCancel from "../pages/payment/PaymentCancel";

// Feature — Subscription Plans (Isolated)
import SubscriptionPage from "../pages/subscription/SubscriptionPage";
import SubscriptionSuccess from "../pages/subscription/SubscriptionSuccess";
import SubscriptionCancel from "../pages/subscription/SubscriptionCancel";


function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Home />} />
      
      {/* Feature 01 — Listing and Browsing */}
      <Route path="/slots/browse" element={<BrowseSlots />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Dynamic Database Table View Router */}
      <Route element={<DashboardLayout />}>
        {/* Intercept 'reports' static path BEFORE the dynamic parameter fallback catches it added by real developer*/}
        <Route path="/collections/reports" element={<Reports />} />
        {/* Shortcut: If someone types just /reports, safely redirect them to the dashboard version added by real developer*/}
        <Route path="/reports" element={<Navigate to="/collections/reports" replace />} />
        {/* Feature 06 — Booking History */}
        <Route path="/bookings/history" element={<BookingHistory />} />

        {/* Dynamic catch for every single database table query */}
        <Route path="/collections/:collectionName" element={<DatabaseCollectionView />} />

        {/* Main Dashboard Panel */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Feature 13 — Slot CRUD Management */}
        <Route path="/slots/mine" element={<MySlots />} />
        <Route path="/slots/new" element={<SlotForm />} />
        <Route path="/slots/:id/edit" element={<SlotForm />} />
        <Route path="/slots/bulk" element={<BulkSlotForm />} />

        {/* Feature — Invoice Generation */}
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/:id" element={<InvoiceView />} />

        {/* Feature — Ratings & Reviews */}
        <Route path="/reviews" element={<ReviewsPage />} />

        {/* Feature 5 — Dynamic Pricing Management */}
        <Route path="/pricing-rules" element={<PricingRules />} />
        <Route path="/pricing-rules/new" element={<PricingRuleForm />} />
        <Route path="/pricing-rules/:id/edit" element={<PricingRuleForm />} />
        
        {/* Feature 14 — Renter Profile & Vehicle Management */}
        <Route path="/profile/vehicles" element={<VehicleManagement />} />
        <Route path="/collections/vehicles" element={<VehicleManagement />} />

        {/* Feature — Payments (Stripe, Isolated) */}
        <Route path="/payments" element={<PaymentsPage />} />

        {/* Feature — Subscription Plans (Isolated) */}
        <Route path="/subscriptions" element={<SubscriptionPage />} />

      </Route>

      {/* Payment redirect pages — outside DashboardLayout (full-screen, no sidebar) */}
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />

      {/* Subscription redirect pages — outside DashboardLayout */}
      <Route path="/subscription/success" element={<SubscriptionSuccess />} />
      <Route path="/subscription/cancel" element={<SubscriptionCancel />} />

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
