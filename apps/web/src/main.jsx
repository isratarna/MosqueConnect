import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Bootstrap CSS supplies layout and form primitives; interactive widgets are React-driven.
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { GoogleMapsProvider } from "./components/GoogleMapsProvider";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <GoogleMapsProvider>
            <App />
          </GoogleMapsProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
