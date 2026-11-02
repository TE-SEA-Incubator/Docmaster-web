import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import { DatesProvider } from "@mantine/dates";
import { useEffect, useState } from "react";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./context/I18nContext";
import { ToastProvider } from "./context/ToastContext";
import ToastContainer from "./components/ui/ToastContainer";
import { docmasterTheme } from "./theme/mantine";
import i18n from "./i18n";
import "@phosphor-icons/web/regular";
import "./index.css";

const DATES_LOCALES: Record<string, string> = { fr: "fr", en: "en", ar: "ar" };

function AppDatesProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<string>(
    DATES_LOCALES[i18n.language] || "fr"
  );

  useEffect(() => {
    const onLang = (lng: string) => setLocale(DATES_LOCALES[lng] || "fr");
    i18n.on("languageChanged", onLang);
    return () => {
      i18n.off("languageChanged", onLang);
    };
  }, []);

  return <DatesProvider settings={{ locale }}>{children}</DatesProvider>;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={docmasterTheme}>
      <AppDatesProvider>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <I18nProvider>
                <App />
                <ToastContainer />
              </I18nProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </AppDatesProvider>
    </MantineProvider>
  </React.StrictMode>
);