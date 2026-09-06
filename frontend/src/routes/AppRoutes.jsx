import BrowseSlots from "../pages/slots/BrowseSlots";
import { Routes, Route, Navigate } from "react-router-dom";
import BookingHistory from "../pages/bookings/BookingHistory";
import OwnerBookings from "../pages/bookings/OwnerBookings";
import RecurringBookings from "../pages/bookings/RecurringBookings";

import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";

// Layout & Dynamic Database View
import DashboardLayout from "../layouts/DashboardLayout";
import { DatabaseCollectionView } from "../pages/DatabaseCollectionView";
import { CollectionGridView } from "../pages/collections/CollectionGridView";

// Feature 13 — Slot CRUD
import MySlots from "../pages/slots/MySlots";
import SlotForm from "../pages/slots/SlotForm";
import BulkSlotForm from "../pages/slots/BulkSlotForm";
import SlotBlackouts from "../pages/slots/SlotBlackouts";
import ManageBuildings from "../pages/buildings/ManageBuildings";
// Feature 02 — Slot Booking & Reservation
import BookSlot from "../pages/bookings/BookSlot";

// Feature 5 — Dynamic Pricing
import PricingRules from "../pages/pricing/PricingRules";
import PricingRuleForm from "../pages/pricing/PricingRuleForm";

// Feature 20 — Reports & Export
import Reports from "../pages/Reports";

// Feature 14 — Renter Profile & Vehicles
import VehicleManagement from "../pages/VehicleManagement";
//import ProtectedRoute from "../components/ProtectedRoute";

// Feature 10 — Overstay Detection and Penalty System
import CheckInOutPage from '../pages/CheckInOutPage';

// Feature 17 — Notification and Alert System
import NotificationsPage from '../pages/NotificationsPage';

// Feature 12 — Admin Control Panel
import AdminPanel from "../pages/AdminPanel";

// Feature — Invoice Generation
import { InvoiceList, InvoiceView } from "../pages/InvoicePage";

import Dashboard from "../pages/Dashboard";
import ReviewsPage from "../pages/ReviewsPage";
import Navigation from "../pages/Navigation";

// Feature — Stripe Payments (Isolated)
import PaymentsPage from "../pages/payment/PaymentsPage";
import PaymentSuccess from "../pages/payment/PaymentSuccess";
import PaymentCancel from "../pages/payment/PaymentCancel";
import BulkPaymentSuccess from "../pages/payment/BulkPaymentSuccess";

import ExtendSuccess from "../pages/payment/ExtendSuccess";
// Feature — Subscription Plans (Isolated)
import SubscriptionPage from "../pages/subscription/SubscriptionPage";
import SubscriptionSuccess from "../pages/subscription/SubscriptionSuccess";
import SubscriptionCancel from "../pages/subscription/SubscriptionCancel";


function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Dynamic Database Table View Router */}
      <Route element={<DashboardLayout />}>
        {/* Feature 01 — Listing and Browsing */}
        <Route path="/slots/browse" element={<BrowseSlots />} />

        {/* Intercept 'reports' static path BEFORE the dynamic parameter fallback catches it added by real developer*/}
        <Route path="/collections/reports" element={<Reports />} />
        {/* Shortcut: If someone types just /reports, safely redirect them to the dashboard version added by real developer*/}
        <Route path="/reports" element={<Navigate to="/collections/reports" replace />} />
        {/* Feature 06 — Booking History */}
        <Route path="/bookings/history" element={<BookingHistory />} />

        {/* Owner — see who's booked into their slots */}
        <Route path="/bookings/owner" element={<OwnerBookings />} />

        {/* Recurring / repeating bookings management */}
        <Route path="/bookings/recurring" element={<RecurringBookings />} />

        {/* Feature 07 — Navigation */}
        <Route path="/navigation" element={<Navigation />} />

        {/* Buildings & Parking Slots — card/box view instead of raw table */}
        <Route path="/collections/buildings" element={<CollectionGridView collectionName="buildings" />} />
        <Route path="/collections/parkingslots" element={<CollectionGridView collectionName="parkingslots" />} />

        {/* Dynamic catch for every single database table query */}
        <Route path="/collections/:collectionName" element={<DatabaseCollectionView />} />

        {/* Main Dashboard Panel */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Feature 13 — Slot CRUD Management */}
        <Route path="/slots/mine" element={<MySlots />} />
        <Route path="/slots/new" element={<SlotForm />} />
        <Route path="/slots/:id/edit" element={<SlotForm />} />
        <Route path="/slots/bulk" element={<BulkSlotForm />} />
        <Route path="/slots/:id/blackouts" element={<SlotBlackouts />} />
        <Route path="/buildings/manage" element={<ManageBuildings />} />
           
        {/* Feature 02 — Slot Booking & Reservation */}
        <Route path="/slots/:id/book" element={<BookSlot />} />

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
        
        {/* Feature 10 — Overstay Detection and Penalty System */}
        <Route path="/checkinout" element={<CheckInOutPage />} />
        
        {/* Feature 17 — Notification and Alert System */}
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/collections/notifications" element={<Navigate to="/notifications" replace />} />

        {/* Feature 12 — Admin Control Panel */}
        <Route path="/admin" element={<AdminPanel />} />

        {/* Feature — Payments (Stripe, Isolated) */}
        <Route path="/payments" element={<PaymentsPage />} />

        {/* Feature — Subscription Plans (Isolated) */}
        <Route path="/subscriptions" element={<SubscriptionPage />} />

      </Route>

      {/* Payment redirect pages — outside DashboardLayout (full-screen, no sidebar) */}
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />
      <Route path="/payment/extend-success" element={<ExtendSuccess />} />
      <Route path="/payment/bulk-success" element={<BulkPaymentSuccess />} />
      {/* Subscription redirect pages — outside DashboardLayout */}
      <Route path="/subscription/success" element={<SubscriptionSuccess />} />
      <Route path="/subscription/cancel" element={<SubscriptionCancel />} />

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;