/** Campo de medida em pixels: guarda só os algarismos do que foi digitado ou colado ("1.920 px" → "1920"). */
export const digitsOnly = (text: string) => text.replace(/\D/g, '')
