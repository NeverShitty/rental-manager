declare module 'intuit-oauth' {
  export default class OAuthClient {
    constructor(options: {
      clientId: string;
      clientSecret: string;
      environment: string;
      redirectUri: string;
    });

    static scopes: {
      Accounting: string;
      Payment: string;
      Payroll: string;
      TimeTracking: string;
      Benefits: string;
      Profile: string;
      Email: string;
      Phone: string;
      Address: string;
      OpenId: string;
      Intuit_name: string;
    };

    token: {
      token_type: string;
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
      id_token?: string;
      realmId?: string;
    };

    environment: {
      sandbox: string;
      production: string;
    };

    authorizeUri(options: {
      scope: string[];
      state: string;
    }): string;

    createToken(url: string): Promise<{
      getJson(): any;
      token?: any;
    }>;

    refresh(): Promise<{
      getJson(): any;
      token?: any;
    }>;

    setToken(token: {
      access_token: string;
      refresh_token: string;
      realmId: string;
    }): void;

    getToken(): {
      realmId: string;
      token_type: string;
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
      id_token?: string;
    };

    isAccessTokenValid(): boolean;
    refreshUsingToken(token: string): Promise<any>;
    refreshUsingCalledUrl(url: string): Promise<any>;
    revoke(options: { token: string }): Promise<any>;
    validateIdToken(id_token: string): Promise<any>;
    getUserInfo(id_token: string): Promise<any>;
  }
}