import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await API.post("/auth/register", formData);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center bg-bgAlt py-16 px-4 min-h-[calc(100vh-140px)]">
        <div className="w-full max-w-md border-4 border-ink bg-bgBase shadow-[8px_8px_0px_0px_rgba(17,17,17,1)]">
          <div className="bg-ink text-bgBase px-4 py-2 font-mono text-xs uppercase font-bold flex justify-between items-center">
            <span>NEW_ACCOUNT</span>
            <span className="flex space-x-2">
              <div className="w-3 h-3 border border-bgBase" />
              <div className="w-3 h-3 border border-bgBase" />
              <div className="w-3 h-3 bg-bgBase" />
            </span>
          </div>

          <div className="p-8 md:p-10">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight mb-8">
              Register
            </h1>

            <form onSubmit={handleSubmit} className="space-y-5 font-mono text-sm">
              <div className="flex flex-col">
                <label htmlFor="name" className="uppercase font-bold mb-2">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Jane Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="border-2 border-ink bg-transparent p-3 focus:outline-none focus:bg-ink focus:text-bgBase transition-none rounded-none placeholder-inkMuted"
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="email" className="uppercase font-bold mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="name@domain.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="border-2 border-ink bg-transparent p-3 focus:outline-none focus:bg-ink focus:text-bgBase transition-none rounded-none placeholder-inkMuted"
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="password" className="uppercase font-bold mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="border-2 border-ink bg-transparent p-3 focus:outline-none focus:bg-ink focus:text-bgBase transition-none rounded-none placeholder-inkMuted"
                />
              </div>

              {error && (
                <div className="border-2 border-alert text-alert font-bold uppercase text-xs px-3 py-2">
                  [ERR] {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-ink text-bgBase font-bold uppercase p-4 hover:bg-highlight hover:text-ink transition-none border-2 border-ink mt-2 disabled:opacity-60"
              >
                {submitting ? ">[PROCESSING...]" : "Register"}
              </button>
            </form>

            <div className="mt-6 font-mono text-xs text-inkMuted uppercase text-center">
              Already have an account?{" "}
              <Link to="/login" className="text-ink font-bold underline">
                Log In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Register;