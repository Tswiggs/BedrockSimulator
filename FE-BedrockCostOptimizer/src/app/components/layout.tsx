import { NavLink, Outlet } from "react-router";
import { LayoutGrid, Calculator, Database, Clock } from "lucide-react";
import { getPricingData } from "./pricing-data";

export function Layout() {
  const pricingData = getPricingData();
  const lastUpdated = new Date(pricingData.metadata.last_updated);
  const formattedDate = lastUpdated.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-2 sm:px-3 lg:px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
                <Database className="w-5 h-5 text-primary-foreground" />
              </div>
              <h4>Bedrock Pricing Tracker</h4>
            </div>

            <nav className="flex items-center gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Pricing Matrix</span>
              </NavLink>
              <NavLink
                to="/simulator"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              >
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline">Workload Simulator</span>
              </NavLink>
            </nav>

            <div className="flex flex-col items-end text-muted-foreground text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Updated: {formattedDate}</span>
              </div>
              <span className="hidden md:inline text-[10px]">by Tyler Swensen</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-2 sm:px-3 lg:px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
