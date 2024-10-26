import { OrganizationMember } from '../interfaces/organization-member.interface';

export class OrganizationResponseDto {
  organization_id: string;
  name: string;
  description: string;
  organization_members: OrganizationMember[];
}

export class CreateOrganizationResponseDto {
  organization_id: string;
  message: string;
}

export class UpdateOrganizationResponseDto {
  organization_id: string;
  name: string;
  description: string;
}

export class DeleteOrganizationResponseDto {
  message: string;
}
