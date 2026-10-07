export function imagemTemAssinaturaValida(bytes: Buffer, mimetype: string): boolean {
  if (mimetype === "image/png")
    return bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  if (mimetype === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimetype === "image/gif") {
    const cabecalho = bytes.toString("ascii", 0, 6);
    return cabecalho === "GIF87a" || cabecalho === "GIF89a";
  }
  return false;
}