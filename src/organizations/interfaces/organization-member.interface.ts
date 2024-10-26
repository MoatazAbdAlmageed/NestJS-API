import { User } from '../../users/schemas/user.schema';

export interface OrganizationMember {
  userId: User;
  accessLevel: string;
}
