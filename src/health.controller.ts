import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller()
export class HealthController {
  @Get("health")
  @ApiOperation({ summary: "Health check" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { ok: { type: "boolean", example: true } },
    },
  })
  health() {
    return { ok: true };
  }
}
