// Kept for backward compatibility — the canonical layout now lives in
// components/Layout.jsx (ticker header, section-anchored nav, shared footer).
import Layout from "../components/Layout";

function MainLayout({ children }) {
  return <Layout>{children}</Layout>;
}

export default MainLayout;
