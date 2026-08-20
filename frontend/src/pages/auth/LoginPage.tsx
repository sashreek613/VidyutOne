import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { BrandMark } from "../../components/common/BrandMark";
import type { UserRole } from "../../types";

export function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>("planner");
  const [email, setEmail] = useState("a.rao@bescom.karnataka.gov.in");
  const [password, setPassword] = useState("demo-access");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    sessionStorage.setItem("vidyutone-role", role);
    sessionStorage.setItem("vidyutone-email", email);
    void navigate(role === "planner" ? "/planner" : "/driver");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-vo-bg text-vo-text">
      <div className="pointer-events-none absolute inset-0 vo-radar opacity-70" />
      <div className="relative mx-auto grid min-h-screen max-w-[1280px] grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="flex flex-col justify-between px-10 py-10 lg:px-16 lg:py-14">
          <div className="flex items-center gap-3">
            <BrandMark size={32} />
            <div>
              <p className="text-[18px] font-semibold text-white">VidyutOne</p>
              <p className="text-[11px] tracking-[0.22em] text-vo-accent">GRID-AWARE EV INFRASTRUCTURE PLATFORM</p>
            </div>
          </div>
          <div className="max-w-[560px] py-16">
            <h1 className="text-[52px] leading-[1.05] font-semibold tracking-[-0.03em] text-white">
              Build chargers where the grid can carry them.
            </h1>
            <p className="mt-6 max-w-[460px] text-[16px] leading-7 text-vo-soft">
              One backend, two doors. Planners see demand, grid headroom and siting verdicts across Bengaluru. Drivers see
              chargers that actually work.
            </p>
          </div>
          <dl className="grid max-w-[560px] grid-cols-3 gap-6">
            <div>
              <dt className="text-[28px] font-semibold text-white">148</dt>
              <dd className="text-[12px] text-vo-muted">candidate sites</dd>
            </div>
            <div>
              <dt className="text-[28px] font-semibold text-white">14</dt>
              <dd className="text-[12px] text-vo-muted">BESCOM divisions</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-[28px] font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-vo-amber" />
                2.1 GW
              </dt>
              <dd className="text-[12px] text-vo-muted">feeder capacity modelled</dd>
            </div>
          </dl>
        </section>

        <section className="flex items-center justify-center px-6 py-10 lg:px-12">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[420px] rounded-3xl border border-vo-border bg-vo-surface/90 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur"
          >
            <h2 className="text-[28px] font-semibold text-white">Sign in</h2>
            <p className="mt-1 text-[13px] text-vo-muted">Choose how you are using VidyutOne.</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <RoleCard
                title="Planner"
                description="DISCOM, city agency, CPO analyst"
                selected={role === "planner"}
                onSelect={() => setRole("planner")}
              />
              <RoleCard
                title="Driver"
                description="EV owner, fleet driver"
                selected={role === "driver"}
                onSelect={() => setRole("driver")}
              />
            </div>

            <label className="mt-6 block text-[11px] tracking-[0.16em] text-vo-muted">
              EMAIL
              <input
                className="mt-2 h-11 w-full rounded-xl border border-vo-border bg-[#0e1318] px-3 text-[13px] text-white outline-none focus:border-vo-accent"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="mt-4 block text-[11px] tracking-[0.16em] text-vo-muted">
              PASSWORD
              <input
                className="mt-2 h-11 w-full rounded-xl border border-vo-border bg-[#0e1318] px-3 text-[13px] text-white outline-none focus:border-vo-accent"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <button
              type="submit"
              className="mt-6 h-12 w-full rounded-xl bg-vo-accent text-[14px] font-semibold text-[#06231b] transition hover:brightness-110"
            >
              {role === "planner" ? "Enter planner console" : "Enter driver console"}
            </button>
            <div className="mt-4 flex justify-between text-[12px] text-vo-muted">
              <span>Forgot password</span>
              <span>Request access</span>
            </div>
          </form>
        </section>
      </div>
      <p className="absolute right-8 bottom-5 text-[10px] tracking-[0.18em] text-vo-muted">
        SAMPLE DATA · BENGALURU URBAN · NOT FOR OPERATIONAL USE
      </p>
    </div>
  );
}

function RoleCard({
  title,
  description,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border px-3 py-3 text-left transition ${
        selected ? "border-vo-accent bg-vo-accent-dim" : "border-vo-border bg-[#0e1318]"
      }`}
    >
      <span className="flex items-start justify-between">
        <span className="text-[14px] font-semibold text-white">{title}</span>
        <span
          className={`mt-0.5 h-3 w-3 rounded-full border ${
            selected ? "border-vo-accent bg-vo-accent" : "border-vo-muted bg-transparent"
          }`}
        />
      </span>
      <span className="mt-1 block text-[11px] leading-4 text-vo-muted">{description}</span>
    </button>
  );
}
