import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { ChildrenBusinessUserService } from './childrenBusinessUser.service';
import { CreateChildAccountDto, RemoveChildDto, SetSecondaryUserDto, GetChildrenQueryDto } from './dto/childrenBusinessUser.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { UserPayload } from '../../common/decorators/user.decorator';
import { TransformResponseInterceptor } from '../../common/interceptors/transform-response.interceptor';

/**
 * ChildrenBusinessUser Controller
 * 
 * Manages parent-child relationships
 */
@ApiTags('Children Business User')
@Controller('children-business-users')
@UseGuards(AuthGuard)
@UseInterceptors(TransformResponseInterceptor)
@ApiBearerAuth()
export class ChildrenBusinessUserController {
  constructor(private childrenService: ChildrenBusinessUserService) {}

  /**
   * POST /children-business-users/children
   * Create child account and add to family
   */
  @Post('children')
  @ApiOperation({ 
    summary: 'Create child account',
    description: 'Create child account and add to family',
  })
  @ApiResponse({ status: 201, description: 'Child account created successfully' })
  async createChild(
    @UserPayload() user: UserPayload,
    @Body() createChildDto: CreateChildAccountDto,
  ) {
    return await this.childrenService.createChildAccount(
      user.userId,
      createChildDto.childUserId,
    );
  }

  /**
   * GET /children-business-users/my-children
   * Get all children of business user
   */
  @Get('my-children')
  @ApiOperation({ 
    summary: 'Get my children',
    description: 'Get all children accounts for current business user',
  })
  @ApiQuery({ name: 'status', required: false, enum: ChildrenBusinessUserStatus })
  async getMyChildren(
    @UserPayload() user: UserPayload,
    @Query() query: GetChildrenQueryDto,
  ) {
    return await this.childrenService.getChildrenOfBusinessUser(
      user.userId,
      query.status,
    );
  }

  /**
   * GET /children-business-users/my-parent
   * Get parent business user for child
   */
  @Get('my-parent')
  @ApiOperation({ 
    summary: 'Get my parent',
    description: 'Get parent business user for current child user',
  })
  async getMyParent(@UserPayload() user: UserPayload) {
    return await this.childrenService.getParentBusinessUser(user.userId);
  }

  /**
   * DELETE /children-business-users/children/:childId
   * Remove child from family
   */
  @Delete('children/:childId')
  @ApiOperation({ 
    summary: 'Remove child',
    description: 'Remove child account from family (soft delete)',
  })
  @ApiResponse({ status: 200, description: 'Child removed successfully' })
  async removeChild(
    @UserPayload() user: UserPayload,
    @Param('childId') childId: string,
    @Body() removeChildDto: RemoveChildDto,
  ) {
    return await this.childrenService.removeChildFromFamily(
      user.userId,
      childId,
      removeChildDto.note,
    );
  }

  /**
   * POST /children-business-users/children/:childId/reactivate
   * Reactivate child account
   */
  @Post('children/:childId/reactivate')
  @ApiOperation({ 
    summary: 'Reactivate child',
    description: 'Reactivate previously removed child account',
  })
  @ApiResponse({ status: 200, description: 'Child reactivated successfully' })
  async reactivateChild(
    @UserPayload() user: UserPayload,
    @Param('childId') childId: string,
  ) {
    return await this.childrenService.reactivateChild(user.userId, childId);
  }

  /**
   * PUT /children-business-users/children/:childId/secondary-user
   * Set/unset child as Secondary User
   */
  @Put('children/:childId/secondary-user')
  @ApiOperation({ 
    summary: 'Set Secondary User',
    description: 'Designate child as Secondary User (can create tasks for family)',
  })
  @ApiResponse({ status: 200, description: 'Secondary User updated successfully' })
  async setSecondaryUser(
    @UserPayload() user: UserPayload,
    @Param('childId') childId: string,
    @Body() setSecondaryUserDto: SetSecondaryUserDto,
  ) {
    return await this.childrenService.setSecondaryUser(
      user.userId,
      childId,
      setSecondaryUserDto.isSecondaryUser,
    );
  }

  /**
   * GET /children-business-users/secondary-user
   * Get Secondary User for current business user
   */
  @Get('secondary-user')
  @ApiOperation({ 
    summary: 'Get Secondary User',
    description: 'Get current Secondary User for business user',
  })
  async getSecondaryUser(@UserPayload() user: UserPayload) {
    return await this.childrenService.getSecondaryUser(user.userId);
  }

  /**
   * GET /children-business-users/statistics
   * Get children statistics
   */
  @Get('statistics')
  @ApiOperation({ 
    summary: 'Get children statistics',
    description: 'Get count of children accounts',
  })
  async getStatistics(@UserPayload() user: UserPayload) {
    const count = await this.childrenService.getChildrenCount(user.userId);
    return { total: count };
  }
}
