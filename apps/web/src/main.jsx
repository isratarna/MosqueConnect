import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Initialises i18next (language detection, <html lang>) before anything renders.
// [Urmee · i18n restore] Must load before anything renders so the language is detected and <html lang>
// is set.
import "./i18n";
import { initTheme } from "./hooks/useTheme";

// Bootstrap CSS supplies layout and form primitives; interactive widgets are React-driven.
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { FollowProvider } from "./context/FollowContext";
import { GoogleMapsProvider } from "./components/GoogleMapsProvider";

initTheme();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <FollowProvider>
            <GoogleMapsProvider>
              <App />
            </GoogleMapsProvider>
          </FollowProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
