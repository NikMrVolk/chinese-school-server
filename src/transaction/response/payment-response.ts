import { IsOptional, IsString } from 'class-validator'

export class YookassaPaymentResponse {
    @IsOptional()
    @IsString()
    confirmationToken?: string
}
