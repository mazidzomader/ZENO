import { Routes, Route, Navigate } from "react-router-dom";

import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";

// Layout & Dynamic Database View
import DashboardLayout from "../layouts/DashboardLayout";
import { DatabaseCollectionView } from "../pages/DatabaseCollectionView";

function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Dynamic Database Table View Router */}
      <Route element={<DashboardLayout />}>
        {/* Dynamic catch for every single database table query */}
        <Route path="/collections/:collectionName" element={<DatabaseCollectionView />} />
        
        {/* Redirect aliases directly to database collections */}
        <Route path="/dashboard" element={<Navigate to="/collections/users" replace />} />
      </Route>

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;