export type RegisterPayload = {
  email: string;
  name: string;
  password: string;
};

export type AuthTokenResponse = {
  access: string;
  refresh: string;
  [key: string]: any;
};

export function register(payload: RegisterPayload): Promise<any>;
export function login(email: string, password: string): Promise<AuthTokenResponse>;
export function refreshToken(refresh: string): Promise<{ access: string }>;

