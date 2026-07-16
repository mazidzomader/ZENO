import Navbar from "./Navbar";
import Footer from "./Footer";

function Layout({ children }) {
  return (
    <div className="font-sans min-h-screen flex flex-col relative border-x-4 border-ink max-w-[1600px] mx-auto bg-bgBase text-ink">
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}

export default Layout;
