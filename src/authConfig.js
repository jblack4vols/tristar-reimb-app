import { PublicClientApplication, LogLevel } from '@azure/msal-browser';

export const MSAL_CONFIG = {
  auth: {
    clientId: 'debda2f0-a35b-44c9-8e0b-9d1d306c49a8',
    authority: 'https://login.microsoftonline.com/668d2c67-481c-4c6c-8904-b08dfd68308c',
    redirectUri: 'https://reimbursementcalculator.tristarpt.com/',
    postLogoutRedirectUri: 'https://reimbursementcalculator.tristarpt.com/',
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
