export class AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
}

export class SignInResponse extends AuthTokensResponse {
  message: string;
}

export class SignUpResponse {
  message: string;
}

export class RefreshTokenResponse extends AuthTokensResponse {
  message: string;
}
