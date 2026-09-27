import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { ChatAnalysisProvider } from "@/components/ChatAnalysisContext";
import { GlobalChatAssistant } from "@/components/GlobalChatAssistant";
import { ProfileMigrationPrompt } from "@/components/ProfileMigrationPrompt";
import { ProfileStatusProvider } from "@/components/ProfileStatusContext";
import { SideNav } from "@/components/SideNav";
import { TrackerStatusProvider } from "@/components/TrackerStatusContext";

// Both /settings and /agent are per-user once sign-in exists (their content
// depends on session + profile state), so they were never meaningfully
// static — and NextAuth's SessionProvider can't be statically prerendered
// anyway (it errors during build otherwise). Forcing dynamic rendering here
// is the correct semantic, not just a workaround. SessionProvider is scoped
// to this route group (not the root layout) so the landing page — which
// never touches auth state — keeps its static generation.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSessionProvider>
      <ProfileStatusProvider>
        <TrackerStatusProvider>
          <ChatAnalysisProvider>
            <div className="flex flex-1 flex-col sm:flex-row">
              <SideNav />
              <div className="flex flex-1 flex-col">
                <ProfileMigrationPrompt />
                {children}
              </div>
            </div>
            <GlobalChatAssistant />
          </ChatAnalysisProvider>
        </TrackerStatusProvider>
      </ProfileStatusProvider>
    </AuthSessionProvider>
  );
}
