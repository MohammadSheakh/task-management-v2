Clean ways to use Swagger (so it doesn’t feel messy)
1. Separate DTOs (Best Practice)

Keep your domain clean:

CreateUserDto → for validation

CreateUserSwaggerDto → for documentation (optional)

Or extend:

export class CreateUserDto {
  email: string;
  password: string;
}

export class CreateUserDocDto extends CreateUserDto {
  @ApiProperty({ example: "john@example.com" })
  email: string;
}

2. Use global decorators instead of repeating

Instead of repeating everywhere:

@ApiResponse({ status: 200, description: "Success" })

Create reusable helpers:

export const ApiSuccessResponse = () =>
  ApiResponse({ status: 200, description: "Success" });

  
3. Keep Swagger mostly in controllers, not everywhere

Avoid polluting:

Services ❌

Entities ❌

Keep it in:

Controllers ✅

DTOs (lightly) ✅

4. Minimal Swagger philosophy (my recommendation for you)

Given your backend style (you care about architecture & scale), I’d suggest:

Only document:

Request body

Response shape (basic)

Skip:

Too many examples

Over-detailed decorators