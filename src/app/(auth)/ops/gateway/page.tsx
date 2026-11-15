import LoginPage from "@/app/(auth)/login/page";
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
  return <LoginPage />;
}
