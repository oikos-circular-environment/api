const PNG_SIGNATURE = Buffer.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function makeMinimalPng(): Buffer {
	const ihdrLength = Buffer.alloc(4);
	ihdrLength.writeInt32BE(13, 0);
	const ihdrType = Buffer.from("IHDR", "latin1");
	const ihdrData = Buffer.alloc(13);
	const crc = Buffer.alloc(4);
	return Buffer.concat([PNG_SIGNATURE, ihdrLength, ihdrType, ihdrData, crc]);
}

export const PNG_MAGIC_BYTES = makeMinimalPng();

export const JPEG_MAGIC_BYTES = Buffer.from([
	0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
