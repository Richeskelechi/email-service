import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiProperty } from "@nestjs/swagger";
import { ApiWrappedResponse } from "./common/decorators/api-wrapped-response.decorator";
import { ResponseMessage } from "./common/decorators/response-message.decorator";

class HealthDataDto {
  @ApiProperty({ type: Boolean, example: true })
  ok!: boolean;
}

@ApiTags("health")
@Controller()
export class HealthController {
  @Get("health")
  @ResponseMessage("OK")
  @ApiOperation({ summary: "Health check" })
  @ApiWrappedResponse({ status: 200, type: HealthDataDto })
  health() {
    return { ok: true };
  }
}
