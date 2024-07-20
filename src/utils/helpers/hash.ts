import * as bcrypt from 'bcrypt'

export const hashValue = async (value: string, saltRounds = 7): Promise<string> => {
    return bcrypt.hash(value, saltRounds)
}

export const compareHash = async (value: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(value, hash)
}
