import { PublicClientApplication, LogLevel } from '@azure/msal-browser';

const AZURE_CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID;
const AZURE_TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || window.location.origin + '/';

export const MSAL_CONFIG = {
  auth: {
    clientId: AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
    redirectUri: REDIRECT_URI,
    postLogoutRedirectUri: REDIRECT_URI,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (level === LogLevel.Error) console.error('[MSAL]', message);
      },
    },
  },
};

export const LOGIN_REQUEST = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};

export const msalInstance = new PublicClientApplication(MSAL_CONFIG);

export async function initMsal() {
  await msalInstance.initialize();
  const response = await msalInstance.handleRedirectPromise();
  if (response) msalInstance.setActiveAccount(response.account);
  else {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) msalInstance.setActiveAccount(accounts[0]);
  }
  return msalInstance.getActiveAccount();
}

export async function msalLogin() {
  await msalInstance.loginRedirect(LOGIN_REQUEST);
}

export async function msalLogout() {
  const account = msalInstance.getActiveAccount();
  await msalInstance.logoutRedirect({ account });
}

export function getMsalAccount() {
  return msalInstance.getActiveAccount();
}
