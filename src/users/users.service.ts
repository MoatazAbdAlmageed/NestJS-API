import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../shared/cache/redis/redis.service';
import { EmailService } from '../shared/services/email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailService,
    private redisService: RedisService,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;

    const existingUser = await this.userModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    const user = new this.userModel({
      ...createUserDto,
      email: email.toLowerCase(),
      password: hashedPassword,
      emailVerificationToken: verificationToken,
    });

    const savedUser = await user.save();

    // Send verification email
    await this.emailService.sendWelcomeEmail(email, createUserDto.name);

    return savedUser;
  }

  async findAll() {
    const cacheKey = 'users:all';
    const cachedUsers = await this.redisService.get(cacheKey);

    if (cachedUsers) {
      return JSON.parse(cachedUsers);
    }

    const users = await this.userModel
      .find()
      .select('-password -refreshTokens')
      .exec();

    await this.redisService.set(cacheKey, JSON.stringify(users), 300); // Cache for 5 minutes
    return users;
  }

  async findOne(id: string) {
    const cacheKey = `user:${id}`;
    const cachedUser = await this.redisService.get(cacheKey);

    if (cachedUser) {
      return JSON.parse(cachedUser);
    }

    const user = await this.userModel
      .findById(id)
      .select('-password -refreshTokens')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.redisService.set(cacheKey, JSON.stringify(user), 300);
    return user;
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { ...updateUserDto, updatedAt: new Date() },
        { new: true },
      )
      .select('-password -refreshTokens');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Invalidate cache
    await this.redisService.del(`user:${id}`);
    await this.redisService.del('users:all');

    return user;
  }

  async updatePassword(id: string, updatePasswordDto: UpdatePasswordDto) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(updatePasswordDto.newPassword, 10);
    user.password = hashedPassword;
    user.refreshTokens = []; // Invalidate all refresh tokens
    await user.save();

    return { message: 'Password updated successfully' };
  }

  async requestPasswordReset(email: string) {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = uuidv4();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Token expires in 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    await this.emailService.sendPasswordResetEmail(email, user.name, resetToken);

    return { message: 'Password reset email sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // Invalidate all refresh tokens
    await user.save();

    return { message: 'Password reset successfully' };
  }

  async verifyEmail(token: string) {
    const user = await this.userModel.findOne({ emailVerificationToken: token });
    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    return { message: 'Email verified successfully' };
  }

  async remove(id: string) {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Invalidate cache
    await this.redisService.del(`user:${id}`);
    await this.redisService.del('users:all');

    return { message: 'User deactivated successfully' };
  }

  async updateUserPreferences(id: string, preferences: Record<string, any>) {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { preferences },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Invalidate cache
    await this.redisService.del(`user:${id}`);

    return user.preferences;
  }
}

