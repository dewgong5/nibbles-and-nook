import { Maintenance } from "@/components/Maintenance";
import { OrderFlow } from "@/components/OrderFlow";

export default function Home() {
  const maintenanceFlag = process.env.MAINTENANCE_FLAG === "true";

  if (maintenanceFlag) {
      return <Maintenance />;
  } else{
    return <OrderFlow/>
  }


}
