export const generateRandomPassword = (minLength: number, maxLength: number): string => {
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+'
    let password = ''
    for (let i = 0; i < length; i++) {
        password += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return password
}
