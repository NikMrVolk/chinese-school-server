import { IsIn, IsNotEmpty, ValidateNested } from 'class-validator'

export class YookassaPaymentDto {
    @IsNotEmpty()
    total: string

    @IsIn(['RUB'])
    currency: string

    @ValidateNested({ each: true })
    items: YookassaItemDto[]

    @IsNotEmpty()
    customerEmail: string
}

export class YookassaItemDto {
    @IsNotEmpty()
    description: string

    @IsNotEmpty()
    quantity: string

    @ValidateNested()
    amount: AmountPayment

    vat_code: string
}

export class AmountPayment {
    @IsNotEmpty()
    value: string

    @IsNotEmpty()
    currency: string
}
