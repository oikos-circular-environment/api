import fastifyCookie from "@fastify/cookie";
import { fastifyCors } from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import { fastifySwagger } from "@fastify/swagger";
import ScalarApiReference from "@scalar/fastify-api-reference";
import Fastify, { type FastifyRequest } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { env } from "@/env/index.js";
import { profileRoutes } from "./modules/profiles/profile-routes.js";
import { userRoutes } from "./modules/users/user-routes.js";

export const app = Fastify({
  logger: true,
}).withTypeProvider<ZodTypeProvider>();

app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: "refreshToken",
    signed: false,
  },
  sign: {
    expiresIn: "7d",
  },
});

app.register(fastifyCookie);

app.register(fastifyRateLimit, {
  max: 100,
  timeWindow: "1 minute",
  cache: 10000,
  allowList: ["/docs", "/docs/openapi.json"],
  skipOnError: false,
  keyGenerator: (request: FastifyRequest) => {
    return request.ip;
  },
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
app.register(fastifyCors, {
  origin: "*",
});

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Oikos Documentation",
      version: "1.0.0",
      contact: {
        name: "Christian Cesar",
        email: "christian.cesar@gmail.com",
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  transform: jsonSchemaTransform,
});

app.register(ScalarApiReference, {
  routePrefix: "/docs",
  configuration: {
    favicon: "https://avatars.githubusercontent.com/u/276378809?s=96&v=4",
    theme: "fastify",
    persistAuth: true,
    authentication: {
      preferredSecurityScheme: "bearerAuth",
      securitySchemes: {
        bearerAuth: {
          token: "",
        },
      },
    },
    metaData: {
      title: "Oikos Documentation",
      description: "Boosting the circular economy",
    },
    servers: [
      {
        url: "https://api.oikos.dev",
        description: "Production server",
      },
      {
        url: `http://localhost:${env.PORT}`,
        description: "Local development server",
        variables: {
          port: {
            default: env.PORT,
          },
        },
      },
    ],
  },
});

app.register(userRoutes, { prefix: "/v1/users" });
app.register(profileRoutes, { prefix: "/v1" });
// app.register(companiesRoutes, { prefix: "/v1/companies" });
