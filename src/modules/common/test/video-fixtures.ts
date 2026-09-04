function ftypBox(brand: string): Buffer {
	const majorBrand = Buffer.from(brand, "latin1");
	const minorVersion = Buffer.alloc(4);
	const compatibleBrands = Buffer.from(brand, "latin1");
	const boxContent = Buffer.concat([
		majorBrand,
		minorVersion,
		compatibleBrands,
	]);
	const size = Buffer.alloc(4);
	size.writeUInt32BE(8 + boxContent.length, 0);
	const type = Buffer.from("ftyp", "latin1");
	return Buffer.concat([size, type, boxContent]);
}

export const MP4_MAGIC_BYTES = ftypBox("isom");

export const MOV_MAGIC_BYTES = ftypBox("qt  ");

const EBML_ROOT_ID = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
const EBML_ROOT_LEN = Buffer.from([0x81]);
const EBML_DOC_TYPE_ID = Buffer.from([0x42, 0x82]);
const EBML_DOC_TYPE_LEN = Buffer.from([0x84]);

export const WEBM_MAGIC_BYTES = Buffer.concat([
	EBML_ROOT_ID,
	EBML_ROOT_LEN,
	EBML_DOC_TYPE_ID,
	EBML_DOC_TYPE_LEN,
	Buffer.from("webm", "latin1"),
]);
