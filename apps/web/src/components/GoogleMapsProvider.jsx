import { createContext, useContext, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { useTranslation } from "react-i18next";
import { GOOGLE_MAPS_API_KEY } from "../config";
import { languageOf } from "../utils/intl";

// Libraries ekbar-i load hoy, tai array ta component-er baire (stable reference).
// "places" PlaceAutocompleteElement er jonno, "geometry" route polyline decode er jonno.
const LIBRARIES = ["places", "geometry"];

const GoogleMapsContext = createContext({
  disabled: true,
  isLoaded: false,
  loadError: undefined,
});

function GoogleMapsLoader({ children }) {
  const { i18n } = useTranslation();
  const [language] = useState(() => languageOf(i18n.resolvedLanguage || i18n.language));
  const { isLoaded, loadError } = useJsApiLoader({
    id: "mc-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
    language,
    region: "BD",
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
