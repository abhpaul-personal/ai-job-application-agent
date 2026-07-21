import { ProfileStatusProvider } from "@/components/ProfileStatusContext";
import { SideNav } from "@/components/SideNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileStatusProvider>
      <div className="flex flex-1 flex-col sm:flex-row">
        <SideNav />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </ProfileStatusProvider>
  );
}
