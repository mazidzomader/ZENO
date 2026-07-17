import { Routes, Route, Navigate } from "react-router-dom";

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

// Feature — Invoice Generation
import { InvoiceList, InvoiceView } from "../pages/InvoicePage";


function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Dynamic Database Table View Router */}
      <Route element={<DashboardLayout />}>
        {/* Intercept 'reports' static path BEFORE the dynamic parameter fallback catches it added by real developer*/}
        <Route path="/collections/reports" element={<Reports />} />
        {/* Shortcut: If someone types just /reports, safely redirect them to the dashboard version added by real developer*/}
        <Route path="/reports" element={<Navigate to="/collections/reports" replace />} />

        {/* Dynamic catch for every single database table query */}
        <Route path="/collections/:collectionName" element={<DatabaseCollectionView />} />

        {/* Redirect aliases directly to database collections */}
        <Route path="/dashboard" element={<Navigate to="/collections/users" replace />} />

        {/* Feature 13 — Slot CRUD Management */}
        <Route path="/slots/mine" element={<MySlots />} />
        <Route path="/slots/new" element={<SlotForm />} />
        <Route path="/slots/:id/edit" element={<SlotForm />} />
        <Route path="/slots/bulk" element={<BulkSlotForm />} />

        {/* Feature — Invoice Generation */}
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/:id" element={<InvoiceView />} />

        {/* Feature 5 — Dynamic Pricing Management */}
        <Route path="/pricing-rules" element={<PricingRules />} />
        <Route path="/pricing-rules/new" element={<PricingRuleForm />} />
        <Route path="/pricing-rules/:id/edit" element={<PricingRuleForm />} />
        
        
      </Route>

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;