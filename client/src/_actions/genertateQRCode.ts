function generateQRCode(ms: number): Promise<void>{
    return new Promise(resolver=> setTimeout(resolver, ms))
}

export default generateQRCode