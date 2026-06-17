import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { env, getMinioConfig } from "@/env/index.js";
import type { StorageFile, StorageProvider } from "../storage.js";

export class MinioBucket implements StorageProvider {
	private client: S3Client;
	private bucket: string;

	constructor() {
		const minio = getMinioConfig();
		this.client = new S3Client({
			endpoint: `http://${minio.endpoint}:${minio.port}`,
			region: "us-east-1",
			credentials: {
				accessKeyId: minio.accessKey,
				secretAccessKey: minio.secretKey,
			},
			forcePathStyle: true,
		});
		this.bucket = minio.bucket;
	}

	async uploadFile(
		filePath: string,
		fileContent: Buffer,
	): Promise<StorageFile | null> {
		try {
			await this.client.send(
				new PutObjectCommand({
					Bucket: this.bucket,
					Key: filePath,
					Body: fileContent,
				}),
			);

			return {
				id: filePath,
				fullPath: `${this.bucket}/${filePath}`,
				path: filePath,
			};
		} catch {
			return null;
		}
	}

	async deleteFile(filePath: string): Promise<void> {
		await this.client.send(
			new DeleteObjectCommand({
				Bucket: this.bucket,
				Key: filePath,
			}),
		);
	}

	async getFileUrl(filePath: string): Promise<{ url: string }> {
		return { url: `${env.APP_PUBLIC_URL}/storage/${filePath}` };
	}

	async checkFileExists(filePath: string): Promise<boolean> {
		try {
			await this.client.send(
				new HeadObjectCommand({
					Bucket: this.bucket,
					Key: filePath,
				}),
			);
			return true;
		} catch {
			return false;
		}
	}

	async convertFileToBase64(filePath: string): Promise<string> {
		const response = await this.client.send(
			new GetObjectCommand({
				Bucket: this.bucket,
				Key: filePath,
			}),
		);

		if (!response.Body) {
			throw new Error("File not found");
		}

		const bytes = await response.Body.transformToByteArray();
		return Buffer.from(bytes).toString("base64");
	}
}
