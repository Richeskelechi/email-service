import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { createOrganization } from "../auth/api-keys";
import { ErrorResponseDto } from "../common/dto/error-response.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { OrganizationResponseDto } from "./dto/organization-response.dto";

@ApiTags("organizations")
@Controller("v1/organizations")
export class OrganizationsController {
  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: "Create an organization",
    description:
      "Issues test and live API keys. Secrets are returned only in this response.",
  })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({ status: 201, type: OrganizationResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  async create(
    @Body() body: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const { organization, testKey, liveKey } = await createOrganization({
      name: body.name,
    });

    return {
      id: organization.id,
      name: organization.name,
      apiKeys: {
        test: {
          id: testKey.id,
          name: testKey.name,
          mode: testKey.mode,
          keyPrefix: testKey.keyPrefix,
          secret: testKey.secret,
        },
        live: {
          id: liveKey.id,
          name: liveKey.name,
          mode: liveKey.mode,
          keyPrefix: liveKey.keyPrefix,
          secret: liveKey.secret,
        },
      },
      warning:
        "Store these secrets now. They are shown once and cannot be retrieved again — use regenerate to issue new ones.",
    };
  }
}
