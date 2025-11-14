import { PublicClientApplication, Configuration } from "@azure/msal-browser";

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID as string | undefined;
const authority = (import.meta.env.VITE_MSAL_AUTHORITY as string | undefined) || (import.meta.env.VITE_MSAL_TENANT_ID ? `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID}` : "https://login.microsoftonline.com/common");

const config: Configuration = {
  auth: {
    clientId: clientId || "",
    authority,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
};

export const msalApp = new PublicClientApplication(config);
export const MSAL_SCOPES = ["User.Read", "Mail.Read"];

export function isMsalConfigured() {
  return !!clientId;
}

let initialized = false;
export async function initMsal() {
  if (initialized) return;
  if (!isMsalConfigured()) return; // evita inicializar sem clientId configurado
  await msalApp.initialize();
  initialized = true;
}
