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

const SITE_URL = "https://necobeat.com.ar";

// Datos estructurados: le dicen a Google (y a sus resúmenes de IA) que Neco Beat es un medio de noticias
// local, y no un homónimo (música, motos, etc.).
const siteJsonLd = [
    {
        "@context": "https://schema.org",
        "@type": "NewsMediaOrganization",
        "@id": `${SITE_URL}/#organization`,
        name: "Neco Beat",
        alternateName: ["NecoBeat", "Neco Beat Noticias", "Neco Beat Necochea"],
        description:
            "Portal de noticias digitales de Necochea, Quequén y la región: política, sociedad, policiales, deportes y cultura.",
        url: SITE_URL,
        logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/icon.png`,
            width: 512,
            height: 512,
        },
        areaServed: ["Necochea", "Quequén", "Partido de Necochea"],
        email: "contacto@necobeat.com.ar",
        sameAs: [
            "https://www.instagram.com/neco.beat/",
            "https://www.facebook.com/profile.php?id=1264073046795517",
            "https://x.com/2262necobeat",
        ],
    },
    {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Neco Beat",
        alternateName: "Neco Beat — Noticias de Necochea",
        url: SITE_URL,
        inLanguage: "es-AR",
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/buscar?q={search_term_string}`,
            "query-input": "required name=search_term_string",
        },
    },
];

export const metadata: Metadata = {
    title: {
        default: "Neco Beat — Noticias de Necochea",
        template: "%s | Neco Beat",
    },
    description:
        "Neco Beat es el portal de noticias de Necochea y Quequén. Información local, rápida y verificada.",
    applicationName: "Neco Beat",
    keywords: ["Neco Beat", "noticias de Necochea", "Quequén", "diario digital", "portal de noticias"],
    metadataBase: new URL("https://necobeat.com.ar"),
    alternates: { canonical: "./" },
    openGraph: {
        siteName: "Neco Beat",
        locale: "es_AR",
        type: "website",
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
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
                />
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
                notifyButton: { enable: false },
              });
              // Los textos del cartel salen del panel de OneSignal (Settings > Web > Push slide prompt).
              // El cartel lo muestra el portal (no depende de "auto prompt" del panel).
              // promptPush() respeta el "Más tarde" y no vuelve a molestar a quien ya decidió.
              setTimeout(function () {
                var yaDecidio = !!OneSignal.Notifications.permission ||
                  (typeof Notification !== "undefined" && Notification.permission === "denied");
                if (!yaDecidio) OneSignal.Slidedown.promptPush();
              }, 8000);
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