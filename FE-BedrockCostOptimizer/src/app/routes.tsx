import { createHashRouter } from "react-router";
import { Layout } from "./components/layout";
import { PricingMatrix } from "./components/pricing-matrix";
import { WorkloadSimulator } from "./components/workload-simulator";
import { CachingPrimer } from "./components/caching-primer";

export const router = createHashRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: PricingMatrix },
      { path: "simulator", Component: WorkloadSimulator },
      { path: "primer", Component: CachingPrimer },
      {
        path: "*",
        Component: () => (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <h2 className="text-xl font-medium">Page Not Found</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                The page you're looking for doesn't exist.
              </p>
            </div>
          </div>
        ),
      },
    ],
  },
]);
