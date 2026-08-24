import { Link, useNavigate } from "react-router-dom";
import { MapPin, BatteryCharging, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { AuthShell } from "../../components/auth/AuthShell";

export function RoleSelectPage() {
  const navigate = useNavigate();

  return (
    <AuthShell>
      <div className="max-w-xl mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Step 1 of 2 — Role Selection</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white">How will you use VidyutOne?</h2>
          <p className="text-sm text-vo-muted">
            Select your account type to continue to specialized setup.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-2">
          {/* Planner Option */}
          <button
            type="button"
            onClick={() => void navigate("/signup/planner")}
            className="group relative text-left p-6 rounded-2xl border border-vo-line bg-vo-card hover:border-cyan-500/60 hover:bg-cyan-500/5 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Planner / Authority
              </h3>
              <p className="text-xs text-vo-muted mt-1 leading-relaxed">
                Government DISCOM, city planning agency, or CPO analyst evaluating EV infrastructure candidate sites. Requires admin verification.
              </p>
            </div>

            <div className="pt-2 flex items-center text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform space-x-1">
              <span>Register as Planner / Authority</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Driver Option */}
          <button
            type="button"
            onClick={() => void navigate("/signup/driver")}
            className="group relative text-left p-6 rounded-2xl border border-vo-line bg-vo-card hover:border-emerald-500/60 hover:bg-emerald-500/5 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
                <BatteryCharging className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                EV Driver
              </h3>
              <p className="text-xs text-vo-muted mt-1 leading-relaxed">
                EV owner or fleet driver discovering chargers, tracking range, and booking charging slots.
              </p>
            </div>

            <div className="pt-2 flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform space-x-1">
              <span>Continue as Driver</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-vo-muted pt-4">
          Already registered?{" "}
          <Link to="/login" className="text-white hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

