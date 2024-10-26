import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RefreshTokenResponse, SignInResponse, SignUpResponse } from './dto/auth-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignInDto } from './dto/sign-in.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto): Promise<SignUpResponse> {
    return this.authService.signup(createUserDto);
  }

  @Post('signin')
  async signin(@Body() signInDto: SignInDto): Promise<SignInResponse> {
    return this.authService.signin(signInDto);
  }

  @Post('refresh-token')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<RefreshTokenResponse> {
    return this.authService.refreshToken(refreshTokenDto);
  }
}
