export type StorageFile = {
	id: string;
	fullPath: string;
	path: string;
};

export interface StorageProvider {
	uploadFile: (
		filePath: string,
		fileContent: Buffer,
	) => Promise<StorageFile | null>;
	deleteFile: (filePath: string) => Promise<void>;
	getFileUrl: (filePath: string) => Promise<{ url: string }>;
	checkFileExists: (filePath: string) => Promise<boolean>;
	ping: () => Promise<void>;
}
