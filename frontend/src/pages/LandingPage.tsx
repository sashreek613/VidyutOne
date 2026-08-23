import { Link } from "react-router-dom";
import { Zap, ShieldCheck, MapPin, Gauge, Layers, Cpu, ArrowRight, BatteryCharging } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-white flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* Navigation Header */}
      <header className="border-b border-gray-800/80 bg-[#0d131f]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">
              VidyutOne
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Platform V1
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/get-started"
              className="text-sm font-semibold text-black bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 px-4 py-2 rounded-lg transition-all shadow-md shadow-cyan-500/15 flex items-center space-x-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-20 pb-16 px-6 max-w-7xl mx-auto overflow-hidden">
          {/* Subtle Grid Background Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="text-center max-w-3xl mx-auto space-y-6 relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-900/80 border border-gray-800 text-xs font-medium text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>EV Mobility & Infrastructure Intelligence</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.15]">
              Build the right chargers. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
                Charge the right way.
              </span>
            </h1>

            <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
              VidyutOne bridges government grid capacity planning with smart EV driver scheduling.
              Evaluating spatial demand alongside electrical feeder headroom to unlock <code className="text-amber-300 font-mono text-sm">BUILD_IF_MANAGED</code> charging locations.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/get-started"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-black bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 font-semibold transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2"
              >
                <span>Launch Experience</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-gray-300 bg-gray-900/80 hover:bg-gray-800 border border-gray-800 font-medium transition-all text-center"
              >
                Sign In to Existing Account
              </Link>
            </div>
          </div>
        </section>

        {/* Dual Platform Cards Section */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-white">One Unified Platform. Two Experiences.</h2>
            <p className="text-sm text-gray-400 mt-1">Connecting urban grid capacity to smart driver behavior.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Planner Card */}
            <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-[#111827]/90 to-[#0d131f]/90 p-8 flex flex-col justify-between hover:border-cyan-500/40 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:bg-cyan-500/10 transition-all" />
              
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 text-cyan-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-between">
                  <span>For Planners & Agencies</span>
                  <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">Web Dashboard</span>
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  AI-assisted charging infrastructure siting considering urban demand, feeder headroom, accessibility, and infrastructure gaps.
                </p>

                <ul className="space-y-3 mb-8 text-xs text-gray-300">
                  <li className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Candidate site selection & heatmaps</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Grid capacity & feeder headroom analysis</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span>Explainable decision verdicts (BUILD, BUILD_IF_MANAGED, DONT_BUILD)</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/get-started?role=planner"
                className="w-full py-3 rounded-lg bg-gray-900 hover:bg-cyan-500/10 border border-gray-800 hover:border-cyan-500/30 text-cyan-400 font-medium text-sm flex items-center justify-center space-x-2 transition-all"
              >
                <span>Access Planner Suite</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Driver Card */}
            <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-[#111827]/90 to-[#0d131f]/90 p-8 flex flex-col justify-between hover:border-emerald-500/40 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/10 transition-all" />

              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400">
                  <BatteryCharging className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-between">
                  <span>For EV Drivers</span>
                  <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Mobile PWA</span>
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  Vehicle-aware charger discovery, range estimation, time-slot reservation, and off-peak grid dynamic pricing discounts.
                </p>

                <ul className="space-y-3 mb-8 text-xs text-gray-300">
                  <li className="flex items-center space-x-2">
                    <Gauge className="w-4 h-4 text-emerald-400" />
                    <span>Real-time range estimation based on EV battery & efficiency</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Reachable charger recommendations</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Slot booking with off-peak dynamic pricing savings</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/get-started?role=driver"
                className="w-full py-3 rounded-lg bg-gray-900 hover:bg-emerald-500/10 border border-gray-800 hover:border-emerald-500/30 text-emerald-400 font-medium text-sm flex items-center justify-center space-x-2 transition-all"
              >
                <span>Open Driver Mobile App</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Managed Siting Innovation Banner */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-gray-900 to-cyan-500/10 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>The Core Innovation: BUILD_IF_MANAGED</span>
              </div>
              <h3 className="text-xl font-bold text-white">Unlocking Constrained Grid Locations</h3>
              <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                Rather than rejecting high-demand sites due to limited peak grid headroom, VidyutOne incentivizes drivers with off-peak dynamic pricing. Distributing peak charging load and making infrastructure viable without expensive grid upgrades.
              </p>
            </div>
            <Link
              to="/get-started"
              className="whitespace-nowrap px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm transition-all shadow-md shadow-amber-400/10"
            >
              Explore Platform
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 bg-[#0d131f] py-8 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 VidyutOne EV Mobility Intelligence Platform.</p>
          <div className="flex space-x-4 text-gray-400">
            <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            <span>•</span>
            <Link to="/get-started" className="hover:text-white transition-colors">Onboarding</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
