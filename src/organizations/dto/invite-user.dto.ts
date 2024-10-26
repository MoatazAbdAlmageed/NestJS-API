import { IsEmail, IsNotEmpty } from 'class-validator';

export class InviteUserDto {
  @IsNotEmpty()
  @IsEmail()
  user_email: string;
}
