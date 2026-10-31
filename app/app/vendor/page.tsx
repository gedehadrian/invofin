import { Dashboard } from "@/modules/dashboard/dashboard";
import { getDashboard } from "@/modules/dashboard/data";
export default async function Page() {
  return <Dashboard data={await getDashboard("vendor")} />;
}
