export const createOtpCode = (quantityNumbers: number = 4) => {
    let code = Math.floor(Math.random() * 10 ** quantityNumbers)
    while (code.toString().length < quantityNumbers) {
        code = code * 10
    }
    return code
}
