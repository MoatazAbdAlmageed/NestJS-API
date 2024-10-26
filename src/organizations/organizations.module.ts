import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '../shared/cache/redis/redis.module';
import { EmailService } from '../shared/services/email/email.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { Organization, OrganizationSchema } from './schemas/organization.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    RedisModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, EmailService],
  exports: [OrganizationsService],
})
export class OrganizationsModule { }