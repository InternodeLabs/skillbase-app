import type { Metadata } from "next";

import { ProfileBalazsPage } from "@/components/ProfileBalazsPage";

export const metadata: Metadata = {
  title: "BalazsKetyi · Skillbase",
  description: "Profile prototype — empty skills state",
};

export default function Page() {
  return <ProfileBalazsPage />;
}
