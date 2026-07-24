import { Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiWrappedResponse } from "../common/decorators/api-wrapped-response.decorator";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { OrganizationResponseDto } from "./dto/organization-response.dto";
import { OrganizationsService } from "./organizations.service";

@ApiTags("organizations")
@Controller("v1/organizations")
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Post()
  @HttpCode(201)
  @ResponseMessage("Organization created successfully")
  @ApiOperation({
    summary: "Create an organization",
    description:
      "Creates the organization, first user, Super Admin role (all permissions), and test/live API keys. Sends a set-password email to the user.",
  })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiWrappedResponse({ status: 201, type: OrganizationResponseDto })
  @ApiWrappedResponse({ status: 400 })
  @ApiWrappedResponse({ status: 409 })
  async create(
    @Body() body: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.create(body);
  }
}
