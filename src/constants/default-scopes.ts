export const defaultScopes = ['id', 'offline', 'tenant', 'email', 'oidc', 'openid', 'access:tenant:all'];

export const concatScopes = (scopes: string[]) => [...new Set([...defaultScopes, ...scopes])];
