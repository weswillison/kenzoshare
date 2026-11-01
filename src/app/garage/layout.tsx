import { notFound } from "next/navigation";
import { modules } from "@/modules.config";

export default function GarageLayout({ children }: LayoutProps<"/garage">) {
  if (!modules.garage) notFound();
  return children;
}
