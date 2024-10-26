import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { PaginationDto } from './dto/pagination.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organization')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) { }

  @Post()
  create(@Body() createOrganizationDto: CreateOrganizationDto, @Request() req) {
    return this.organizationsService.create(createOrganizationDto, req.user.id);
  }

  @Get()
  findAll(@Request() req, @Query() paginationDto: PaginationDto) {
    return this.organizationsService.findAll(req.user.id, paginationDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.organizationsService.findOne(id, req.user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @Request() req,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.organizationsService.remove(id, req.user.id);
  }

  @Post(':id/invite')
  inviteUser(
    @Param('id') id: string,
    @Body() inviteUserDto: InviteUserDto,
    @Request() req,
  ) {
    return this.organizationsService.inviteUser(id, inviteUserDto, req.user.id);
  }
}
