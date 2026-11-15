import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, ChevronDown, Eye, EyeOff, UserCircle2, X } from "lucide-react";
import GoogleGIcon from "./GoogleGIcon";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatNameFromEmail(email) {
  const localPart = email.split("@")[0] || "Dispatch User";
  const words = localPart
    .split(/[._-]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  if (words.length === 0) return "Dispatch User";
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export default function GoogleAccountModal({
  isOpen,
  onClose,
  onSubmitProfile,
  onErrorToast,
  submitting,
}) {
  const [step, setStep] = useState(1); // 1 = Email, 2 = Password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inlineError, setInlineError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setInlineError("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(e) {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, submitting]);

  if (!isOpen) return null;

  function handleStepOneSubmit(e) {
    e.preventDefault();
    setInlineError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      const msg = "Couldn't find your Google Account. Enter a valid email.";
      setInlineError(msg);
      if (typeof onErrorToast === "function") {
        onErrorToast(msg);
      }
      return;
    }

    setEmail(trimmedEmail.toLowerCase());
    setPassword("");
    setInlineError("");
    setStep(2);
  }

  async function handleStepTwoSubmit(e) {
    e.preventDefault();
    setInlineError("");

    if (!password || password.length < 6) {
      const msg = "Password must be at least 6 characters long.";
      setInlineError(msg);
      if (typeof onErrorToast === "function") {
        onErrorToast(msg);
      }
      return;
    }

    try {
      await onSubmitProfile({
        email: email.trim().toLowerCase(),
        name: formatNameFromEmail(email.trim()),
        password,
      });
    } catch (err) {
      const msg = err?.message || "Wrong Google account password. Try again.";
      setInlineError(msg);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A2327]/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-signin-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-[430px] rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-auto text-slate-900">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close Google Sign-In"
          className="absolute right-4 top-4 inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-7 sm:px-9 pt-9 pb-8">
          {/* Google G Logo & Heading */}
          <div className="flex flex-col items-center text-center">
            <GoogleGIcon className="w-9 h-9" />
            <h2
              id="google-signin-title"
              className="mt-4 text-2xl font-medium tracking-tight text-slate-900"
            >
              {step === 1 ? "Sign in" : "Welcome"}
            </h2>

            {step === 1 ? (
              <p className="mt-1.5 text-sm text-slate-600">
                Use your Google Account
              </p>
            ) : (
              <div className="mt-3 inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setInlineError("");
                  }}
                  disabled={submitting}
                  title="Change email address"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white pl-2 pr-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  <UserCircle2 className="w-4 h-4 text-slate-500" />
                  <span>{email}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            )}
          </div>

          {step === 1 ? (
            <form onSubmit={handleStepOneSubmit} noValidate className="mt-7 space-y-5">
              <div>
                <label
                  htmlFor="google-step1-email"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  Email or phone
                </label>
                <input
                  id="google-step1-email"
                  type="email"
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (inlineError) setInlineError("");
                  }}
                  placeholder="name@gmail.com"
                  className={`w-full rounded-lg border px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    inlineError
                      ? "border-red-600 focus:border-red-600 focus:ring-red-200"
                      : "border-slate-300 focus:border-[#1A73E8] focus:ring-[#1A73E8]/20"
                  }`}
                />

                {inlineError ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-red-600">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{inlineError}</span>
                  </p>
                ) : null}
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Local evaluation mode: sign in with any Google-style email and password to access{" "}
                <span className="font-semibold text-slate-700">Dispatch</span>.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm font-medium text-[#1A73E8] hover:bg-blue-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#1A73E8] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1557B0] transition shadow-sm"
                >
                  Next
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleStepTwoSubmit} noValidate className="mt-7 space-y-5">
              <div>
                <label
                  htmlFor="google-step2-password"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  Enter your password
                </label>
                <div className="relative">
                  <input
                    id="google-step2-password"
                    type={showPassword ? "text" : "password"}
                    autoFocus
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (inlineError) setInlineError("");
                    }}
                    placeholder="Enter your password"
                    className={`w-full rounded-lg border pl-3.5 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                      inlineError
                        ? "border-red-600 focus:border-red-600 focus:ring-red-200"
                        : "border-slate-300 focus:border-[#1A73E8] focus:ring-[#1A73E8]/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {inlineError ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-red-600">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{inlineError}</span>
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setInlineError("");
                  }}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-[#1A73E8] hover:bg-blue-50 transition disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-[#1A73E8] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1557B0] transition shadow-sm disabled:opacity-60"
                >
                  {submitting ? "Verifying..." : "Next"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
