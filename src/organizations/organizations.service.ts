import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RedisService } from '../shared/cache/redis/redis.service';
import { EmailService } from '../shared/services/email/email.service';
import { User } from '../users/schemas/user.schema';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { PaginationDto } from './dto/pagination.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization, OrganizationDocument } from './schemas/organization.schema';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
    @InjectModel(User.name)
    private userModel: Model<typeof User>,
    private emailService: EmailService,
    private redisService: RedisService,
  ) { }


  async findOne(id: string, userId: string) {
    const cacheKey = `organization:${id}:${userId}`;
    const cachedData = await this.redisService.get(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const organization = await this.organizationModel
      .findOne({
        _id: id,
        'members.userId': userId,
        isDeleted: false,
      })
      .populate('members.userId', 'name email');

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    await this.redisService.set(cacheKey, JSON.stringify(organization), 300);
    return organization;
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
    userId: string,
  ) {
    const organization = await this.organizationModel.findOne({
      _id: id,
      'members.userId': userId,
      'members.accessLevel': 'admin',
      isDeleted: false,
    });

    if (!organization) {
      throw new UnauthorizedException(
        'Not authorized to update this organization',
      );
    }

    const updatedOrg = await this.organizationModel
      .findByIdAndUpdate(
        id,
        { ...updateOrganizationDto, updatedAt: new Date() },
        { new: true },
      )
      .populate('members.userId', 'name email');

    // Invalidate cache
    await this.redisService.del(`organization:${id}:${userId}`);

    return updatedOrg;
  }

  async remove(id: string, userId: string) {
    const organization = await this.organizationModel.findOne({
      _id: id,
      'members.userId': userId,
      'members.accessLevel': 'admin',
      isDeleted: false,
    });

    if (!organization) {
      throw new UnauthorizedException(
        'Not authorized to delete this organization',
      );
    }

    // Soft delete
    await this.organizationModel.findByIdAndUpdate(id, {
      isDeleted: true,
      updatedAt: new Date(),
    });

    // Invalidate cache
    await this.redisService.del(`organization:${id}:${userId}`);

    return { message: 'Organization deleted successfully' };
  }




  async create(createOrganizationDto: CreateOrganizationDto, userId: string) {
    const organization = new this.organizationModel({
      ...createOrganizationDto,
      members: [
        {
          userId: new Types.ObjectId(userId),
          accessLevel: 'admin',
          joinedAt: new Date()
        }
      ],
    });

    const savedOrg = await organization.save();
    return {
      organization_id: savedOrg._id,
      message: 'Organization created successfully',
    };
  }

  async findAll(userId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const cacheKey = `organizations:${userId}:${page}:${limit}`;
    const cachedData = await this.redisService.get(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const organizations = await this.organizationModel
      .find({
        'members.userId': new Types.ObjectId(userId),
        isDeleted: false,
      })
      .populate('members.userId', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    const total = await this.organizationModel.countDocuments({
      'members.userId': new Types.ObjectId(userId),
      isDeleted: false,
    });

    const result = {
      organizations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }


  async inviteUser(organizationId: string, inviteUserDto: InviteUserDto, inviterId: string) {
    const organization = await this.organizationModel.findOne({
      _id: organizationId,
      'members.userId': new Types.ObjectId(inviterId),
      'members.accessLevel': 'admin',
      isDeleted: false,
    });

    if (!organization) {
      throw new UnauthorizedException('Not authorized to invite users');
    }

    const invitedUser = await this.userModel.findOne({
      email: inviteUserDto.user_email,
    });

    if (!invitedUser) {
      throw new NotFoundException('User not found');
    }

    if (
      organization.members.some(
        (member) => member.userId.toString() === invitedUser._id.toString(),
      )
    ) {
      throw new BadRequestException('User is already a member');
    }

    // Add member with default access level
    organization.members.push({
      userId: invitedUser._id,
      accessLevel: 'member',
      joinedAt: new Date(),
    });

    await organization.save();

    // Send invitation email
    try {
      const inviter = await this.userModel.findById(inviterId);
      await this.emailService.sendOrganizationInvite(
        inviteUserDto.user_email,
        organization.name,
        inviter.name,
      );
    } catch (error) {
      console.error('Failed to send invitation email:', error);
    }

    // Invalidate cache
    await this.redisService.del(`organization:${organizationId}:${inviterId}`);

    return { message: 'User invited successfully' };
  }
}



