import { createContext, useContext } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "../config";

const GoogleMapsContext = createContext({
  disabled: true,
  isLoaded: false,
  loadError: undefined,
});

function GoogleMapsLoader({ children }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "mc-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  return (
    <GoogleMapsContext.Provider value={{ disabled: false, isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function GoogleMapsProvider({ children }) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <GoogleMapsContext.Provider value={{ disabled: true, isLoaded: false, loadError: undefined }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  return <GoogleMapsLoader>{children}</GoogleMapsLoader>;
}

export function useGoogleMapsLoader() {
  return useContext(GoogleMapsContext);
}
