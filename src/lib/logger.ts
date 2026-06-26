import pino from "pino";
import { env } from "@/env/index.js";

const isTest = env.NODE_ENV === "test";
const isDev = env.NODE_ENV === "dev";

export const serverLogger: pino.Logger = isTest
	? pino({ level: "silent" })
	: pino(
			{ level: env.LOG_LEVEL },
			pino.transport({
				targets: [
					...(isDev
						? [
								{
									target: "pino-pretty",
									options: {
										translateTime: "HH:MM:ss Z",
										ignore: "pid,hostname",
									},
									level: env.LOG_LEVEL,
								},
							]
						: []),
					{
						target: "pino/file",
						options: { destination: "logs/server.log", append: true, mkdir: true },
						level: env.LOG_LEVEL,
					},
				],
			}),
		);

export const queryLogger: pino.Logger = isTest
	? pino({ level: "silent" })
	: pino(
			{ level: "info", base: null },
			pino.transport({
				target: "pino/file",
				options: { destination: "logs/queries.log", append: true, mkdir: true },
			}),
		);
