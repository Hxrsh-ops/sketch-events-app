import AdminLoginView from "@/components/auth/admin-login-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operations Gateway | SketchHUB",
  description: "Campus Operations Administrative Gateway",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function OpsGatewayPage() {
  return <AdminLoginView />;
}
