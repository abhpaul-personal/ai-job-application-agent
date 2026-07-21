import { defaultProfile } from "@/lib/loadProfile";
import { SettingsView } from "./SettingsView";

export default function SettingsPage() {
  return <SettingsView defaultProfile={defaultProfile} />;
}
