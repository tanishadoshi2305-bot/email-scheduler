import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BrandStamp from "../components/BrandStamp";
import GoogleAccountModal from "../components/GoogleAccountModal";
import GoogleGIcon from "../components/GoogleGIcon";
import StarburstIcon from "../components/StarburstIcon";

const CONFIGURED_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOAST_DURATION_MS = 4000;

export default function LoginPage() {
  const { isAuthenticated, login, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState(() =>
    searchParams.get("mode") === "register" ? "register" : "login"
  ); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googlePickerOpen, setGooglePickerOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [toast, setToast] = useState(null); // { id, type: "error" | "success", title, message }

  const redirectTimerRef = useRef(null);

  const showToast = useCallback((type, message, title) => {
    setToast({
      id: Date.now(),
      type,
      title: title || (type === "success" ? "Success" : "Authentication Error"),
      message,
    });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  // Auto-dismiss pop-up toast after 4 seconds
  useEffect(() => {
    if (!toast) return undefined;
    const timerId = window.setTimeout(() => {
      setToast(null);
    }, TOAST_DURATION_MS);

    return () => window.clearTimeout(timerId);
  }, [toast]);

  // Cleanup redirect timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  if (isAuthenticated && !isRedirecting) {
    return <Navigate to="/dashboard" replace />;
  }

  const anyBusy = submitting || googleSubmitting || isRedirecting;

  function completeAuthWithRedirect() {
    setIsRedirecting(true);
    showToast("success", "Welcome back! Redirecting to dashboard...", "Signed In");
    redirectTimerRef.current = window.setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 850);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (mode === "register") {
      if (!trimmedName || !trimmedEmail || !password) {
        showToast("error", "All fields (name, email, and password) are required.");
        return;
      }
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        showToast("error", "Please enter a valid email address.");
        return;
      }
      if (password.length < 6) {
        showToast("error", "Password must be at least 6 characters long.");
        return;
      }
    } else {
      if (!trimmedEmail || !password) {
        showToast("error", "Please enter both your email and password.");
        return;
      }
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        showToast("error", "Please enter a valid email address.");
        return;
      }
    }

    setSubmitting(true);
    setIsRedirecting(true);
    try {
      if (mode === "login") {
        await login(trimmedEmail, password);
      } else {
        await register(trimmedName, trimmedEmail, password);
      }
      completeAuthWithRedirect();
    } catch (err) {
      setIsRedirecting(false);
      showToast("error", err.message || "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleCredentialSuccess(credentialResponse) {
    if (!credentialResponse?.credential) {
      showToast("error", "Google Sign-In did not return a valid credential.");
      return;
    }

    setGoogleSubmitting(true);
    setIsRedirecting(true);
    try {
      await googleLogin({ credential: credentialResponse.credential });
      completeAuthWithRedirect();
    } catch (err) {
      setIsRedirecting(false);
      showToast("error", err.message || "Google Sign-In failed. Please try again.");
    } finally {
      setGoogleSubmitting(false);
    }
  }

  async function handleMockGoogleProfile(mockProfile) {
    setGoogleSubmitting(true);
    setIsRedirecting(true);
    try {
      await googleLogin({ mockProfile });
      setGooglePickerOpen(false);
      completeAuthWithRedirect();
    } catch (err) {
      setIsRedirecting(false);
      showToast("error", err.message || "Google Sign-In failed. Please try again.");
      throw err;
    } finally {
      setGoogleSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#3A2327] flex flex-col justify-between py-6 px-4 sm:px-6">
      {/* Top-Right Pop-Up Toast Notification */}
      {toast ? (
        <div
          key={toast.id}
          role="alert"
          aria-live="assertive"
          className={`fixed top-5 right-5 z-[60] w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl border-2 border-[#3A2327] shadow-editorial p-4 animate-toast-in ${
            toast.type === "success"
              ? "bg-[#FAF6F0] text-[#3A2327]"
              : "bg-red-50 text-red-950"
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#3A2327] shrink-0 mt-0.5 ${
                toast.type === "success"
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-red-200 text-red-900"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider">
                {toast.title}
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={dismissToast}
              aria-label="Dismiss notification"
              className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-[#3A2327]/10 transition shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Top minimal back link */}
      <div className="mx-auto w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3A2327]/80 hover:text-[#3A2327] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dispatch Home
        </Link>
      </div>

      {/* Centered Editorial Auth Card */}
      <main className="mx-auto w-full max-w-md my-6">
        <div className="rounded-3xl bg-[#FAF6F0] border-2 border-[#3A2327] shadow-editorial overflow-hidden">
          {/* Soft Blush Header Strip */}
          <div className="bg-[#F3DCE6] border-b-[1.5px] border-[#3A2327] px-6 py-6 flex flex-col items-center text-center gap-3">
            <div className="flex items-center justify-between w-full">
              <StarburstIcon className="w-5 h-5 text-[#3A2327]/80" title="" />
              <BrandStamp variant="cream" size="md" tilt="-rotate-2" />
              <StarburstIcon className="w-5 h-5 text-[#3A2327]/80" title="" />
            </div>
            <p className="font-display text-2xl font-semibold text-[#3A2327] mt-1">
              {mode === "login" ? "Welcome Back" : "Create Your Studio"}
            </p>
            <p className="text-xs text-[#3A2327]/75 max-w-xs">
              Sign in to schedule queued dispatches, manage bulk batches, and inspect Ethereal previews.
            </p>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Dual-Mode Continue with Google */}
            <div>
              {CONFIGURED_GOOGLE_CLIENT_ID ? (
                <div className="flex flex-col items-center justify-center rounded-full bg-[#FAF6F0] border-[1.5px] border-[#3A2327] py-1.5 px-3 shadow-editorialSm">
                  {googleSubmitting ? (
                    <span className="py-2 text-sm font-semibold text-[#3A2327]">
                      Verifying Google session...
                    </span>
                  ) : (
                    <GoogleLogin
                      onSuccess={handleGoogleCredentialSuccess}
                      onError={() =>
                        showToast(
                          "error",
                          "Google authentication failed or was cancelled. Please try again."
                        )
                      }
                      theme="outline"
                      size="large"
                      shape="pill"
                      text="continue_with"
                      width="330"
                    />
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setGooglePickerOpen(true)}
                  disabled={anyBusy}
                  className="w-full inline-flex items-center justify-center gap-3 rounded-full bg-[#FAF6F0] border-[1.5px] border-[#3A2327] px-4 py-3 text-sm font-semibold text-[#3A2327] shadow-editorialSm hover:bg-[#F3DCE6]/75 transition disabled:opacity-60"
                >
                  <GoogleGIcon className="w-5 h-5 shrink-0" />
                  <span>{googleSubmitting ? "Signing in with Google..." : "Continue with Google"}</span>
                </button>
              )}
            </div>

            {/* Crisp Editorial Divider */}
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-[#3A2327]/25" />
              <span className="mx-3 shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-[#3A2327]/65">
                OR CONTINUE WITH EMAIL
              </span>
              <div className="flex-grow border-t border-[#3A2327]/25" />
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 gap-1.5 rounded-full bg-[#F3DCE6]/70 border-[1.5px] border-[#3A2327] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  dismissToast();
                }}
                className={`rounded-full py-2 text-xs sm:text-sm font-bold transition ${
                  mode === "login"
                    ? "bg-[#3A2327] text-[#FAF6F0]"
                    : "text-[#3A2327] hover:bg-[#FAF6F0]/60"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  dismissToast();
                }}
                className={`rounded-full py-2 text-xs sm:text-sm font-bold transition ${
                  mode === "register"
                    ? "bg-[#3A2327] text-[#FAF6F0]"
                    : "text-[#3A2327] hover:bg-[#FAF6F0]/60"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {mode === "register" ? (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-bold uppercase tracking-wider text-[#3A2327] mb-1.5"
                  >
                    Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Editorial"
                    className="w-full rounded-xl bg-white/85 border-[1.5px] border-[#3A2327] px-3.5 py-2.5 text-sm text-[#3A2327] placeholder:text-[#3A2327]/45 focus:outline-none focus:ring-2 focus:ring-[#E6A8BF]"
                  />
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-bold uppercase tracking-wider text-[#3A2327] mb-1.5"
                >
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-white/85 border-[1.5px] border-[#3A2327] px-3.5 py-2.5 text-sm text-[#3A2327] placeholder:text-[#3A2327]/45 focus:outline-none focus:ring-2 focus:ring-[#E6A8BF]"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-bold uppercase tracking-wider text-[#3A2327] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "register" ? "At least 6 characters" : "Enter password"}
                    className="w-full rounded-xl bg-white/85 border-[1.5px] border-[#3A2327] pl-3.5 pr-10 py-2.5 text-sm text-[#3A2327] placeholder:text-[#3A2327]/45 focus:outline-none focus:ring-2 focus:ring-[#E6A8BF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3A2327]/65 hover:text-[#3A2327]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={anyBusy}
                className="w-full rounded-full bg-[#3A2327] border-[1.5px] border-[#3A2327] py-3 text-sm font-semibold text-[#FAF6F0] hover:bg-[#3A2327]/90 transition disabled:opacity-60"
              >
                {submitting
                  ? mode === "login"
                    ? "Signing in..."
                    : "Creating account..."
                  : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-[#3A2327]/60">
        Dispatch Studio · Crafted for Intentional Communication
      </footer>

      {/* Realistic 2-Step Google Sign-In Modal (Local Mode) */}
      <GoogleAccountModal
        isOpen={googlePickerOpen}
        onClose={() => setGooglePickerOpen(false)}
        onSubmitProfile={handleMockGoogleProfile}
        onErrorToast={(message) => showToast("error", message)}
        submitting={googleSubmitting}
      />
    </div>
  );
}
