import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type OrganizationDocument = Organization & Document;

@Schema()
class OrganizationMember {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: any;

  @Prop({ required: true, enum: ['admin', 'member', 'viewer'] })
  accessLevel: string;

  @Prop({ default: Date.now })
  joinedAt: Date;
}

@Schema({ timestamps: true })
export class Organization {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: [OrganizationMember] })
  members: OrganizationMember[];

  @Prop({ default: false })
  isDeleted: boolean;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
