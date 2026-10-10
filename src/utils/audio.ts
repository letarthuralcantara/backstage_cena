export function audioTemAssinaturaValida(bytes: Buffer): boolean {
  const ascii = bytes.toString("ascii", 0, 12);
  const frameMpegValido = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;

  return (
    ascii.startsWith("ID3") ||
    frameMpegValido ||
    ascii.startsWith("OggS") ||
    ascii.startsWith("RIFF") ||
    ascii.includes("ftyp") ||
    bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  );
}
