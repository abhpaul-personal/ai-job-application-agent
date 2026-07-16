import { defaultProfile } from "@/lib/loadProfile";
import { OnboardingWizard } from "./OnboardingWizard";

export default function OnboardingPage() {
  return <OnboardingWizard defaultProfile={defaultProfile} />;
}
