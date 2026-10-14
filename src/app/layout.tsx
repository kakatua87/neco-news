import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";
import Script from "next/script";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    display: "swap",
});

const merriweather = Merriweather({
    variable: "--font-merriweather",
    subsets: ["latin"],
    weight: ["400", "700", "900"],
    display: "swap",
});

export const metadata: Metadata = {
    title: {
        default: "Neco Beat — Noticias de Necochea",
        template: "%s | Neco Beat",
    },
    description:
        "El portal de noticias de Necochea y Quequén. Información local, rápida y verificada.",
    metadataBase: new URL("https://necobeat.com.ar"),
    openGraph: {
        siteName: "Neco Beat",
        locale: "es_AR",
        type: "website",
    },
    twitter: {
        site: "@neconow",
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="es"
            className={`${inter.variable} ${merriweather.variable} h-full antialiased`}
        >
            <head>
                {process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID && (
                    <>
                        <Script
                            src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
                            defer
                            strategy="afterInteractive"
                        />
                        <Script id="onesignal-init" strategy="afterInteractive">
                            {`
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(async function(OneSignal) {
              await OneSignal.init({
                appId: "${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID}",
                safari_web_id: "${process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_ID || ""}",
                notifyButton: {
                  enable: true,
                  position: "bottom-left",
                  size: "medium",
                  showCredit: false,
                  prenotify: true,
                  text: {
                    "tip.state.unsubscribed": "Suscribite a las notificaciones",
                    "tip.state.subscribed": "Estás suscripto a las notificaciones",
                    "tip.state.blocked": "Bloqueaste las notificaciones",
                    "message.prenotify": "Hacé clic para recibir las últimas noticias",
                    "message.action.subscribed": "¡Gracias por suscribirte!",
                    "message.action.resubscribed": "Volviste a suscribirte",
                    "message.action.unsubscribed": "Ya no recibirás notificaciones",
                    "dialog.main.title": "Notificaciones de Neco Beat",
                    "dialog.main.button.subscribe": "SUSCRIBIRME",
                    "dialog.main.button.unsubscribe": "DESUSCRIBIRME",
                    "dialog.blocked.title": "Desbloquear notificaciones",
                    "dialog.blocked.message": "Seguí estas instrucciones para permitir las notificaciones:",
                  },
                },
                promptOptions: {
                  slidedown: {
                    prompts: [
                      {
                        type: "push",
                        autoPrompt: false,
                        text: {
                          actionMessage: "Recibí las últimas noticias de Necochea en tu navegador. Podés desactivarlas cuando quieras.",
                          acceptButton: "Suscribirme",
                          cancelButton: "Más tarde",
                        },
                      },
                    ],
                  },
                },
              });
            });
          `}
                        </Script>
                    </>
                )}
            </head>
            <body className="min-h-full flex flex-col bg-white text-ink font-sans">
                <Header />
                <main className="flex-1 flex flex-col min-w-0">
                    {children}
                </main>
                <Footer />
                <WhatsAppFloatingButton />
            </body>
        </html>
    );
}