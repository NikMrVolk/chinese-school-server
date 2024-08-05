import { YookassaItemDto } from '../dto/yookassa.dto'

export interface ICustomer {
    full_name?: string
    inn?: string
    email?: string
    phone?: string
}

export interface IReceipt {
    customer?: ICustomer
    items: YookassaItemDto[]
    tax_system_code?: any
}
