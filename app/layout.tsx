import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeContext";
import "./globals.css";

// Runs before hydration to avoid a flash of the wrong theme. Can't import
// lib/theme.ts here — this has to be raw JS inlined ahead of any bundled
// module — so it deliberately re-implements resolveInitialTheme()'s logic;
// keep the two in sync if that logic ever changes.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("aka.theme");var t=(s==="dark"||s==="light")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");if(t==="dark"){document.documentElement.setAttribute("data-theme","dark");}}catch(e){}})();`;

const FEEDBACK_MAILTO_HREF =
  "mailto:abhpaul@gmail.com" +
  `?subject=${encodeURIComponent("Job Kit Agent feedback")}` +
  `&body=${encodeURIComponent("What's working / what's not:\n\n(Optional) Your name:")}`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job Kit Agent",
  description:
    "Onboard once, and compile a personalized job-application agent from your profile.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <footer className="px-6 py-4 text-center text-xs text-text-secondary">
            © {new Date().getFullYear()}{" "}
            <a
              href="https://www.linkedin.com/in/abhpaul"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Abhijit Paul
            </a>
            {" · "}
            <a href={FEEDBACK_MAILTO_HREF} className="underline hover:text-foreground">
              Feedback
            </a>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
