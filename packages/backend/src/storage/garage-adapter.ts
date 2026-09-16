import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { GarageEnvironment } from "@lasoviet/config";

import type {
  ObjectMetadata,
  ObjectStore,
  SignedDownload,
} from "./object-store.js";

const MIN_SIGNED_DOWNLOAD_SECONDS = 60;
const MAX_SIGNED_DOWNLOAD_SECONDS = 300;
const GARAGE_ORIGIN = "http://garage:3900";

type S3ClientLike = {
  send(command: object): Promise<unknown>;
};

export type GarageAdapterDependencies = {
  client?: S3ClientLike;
  createSignedUrl?: (
    client: S3ClientLike,
    command: GetObjectCommand,
    options: { expiresIn: number },
  ) => Promise<string>;
  now?: () => Date;
};

type HeadResponse = {
  Metadata?: Record<string, string | undefined>;
  ContentLength?: number;
  ETag?: string;
  VersionId?: string;
};

type PutResponse = {
  ETag?: string;
  VersionId?: string;
};

function unavailable(): Error {
  return new Error("GARAGE_UNAVAILABLE");
}

function validObjectKey(objectKey: string): boolean {
  return (
    objectKey.length > 0 &&
    objectKey.length <= 1024 &&
    !objectKey.startsWith("/") &&
    !objectKey.includes("\\") &&
    !objectKey.split("/").some((part) => part === "" || part === "." || part === "..")
  );
}

function requiredMetadata(
  metadata: Record<string, string | undefined> | undefined,
  contentLength: number | undefined,
): Pick<ObjectMetadata, "sha256" | "byteLength"> | null {
  const sha256 = metadata?.sha256;
  const byteLength = Number(metadata?.bytelength ?? contentLength);
  if (
    sha256 === undefined ||
    !/^[a-f0-9]{64}$/.test(sha256) ||
    !Number.isSafeInteger(byteLength) ||
    byteLength <= 0
  ) {
    return null;
  }
  return { sha256, byteLength };
}

function enabledEnvironment(environment: GarageEnvironment): Extract<GarageEnvironment, { enabled: true }> {
  if (!environment.enabled) {
    throw unavailable();
  }
  return environment;
}

function createClient(
  environment: Extract<GarageEnvironment, { enabled: true }>,
  suppliedClient?: S3ClientLike,
): S3ClientLike {
  return suppliedClient ?? new S3Client({
    endpoint: environment.endpoint,
    region: environment.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: environment.accessKeyId,
      secretAccessKey: environment.secretAccessKey,
    },
  }) as unknown as S3ClientLike;
}

export async function probeGarageReadiness(
  environment: GarageEnvironment,
  dependencies: Pick<GarageAdapterDependencies, "client"> = {},
): Promise<void> {
  const config = enabledEnvironment(environment);
  const client = createClient(config, dependencies.client);
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
  } catch {
    throw unavailable();
  }
}

export function createGarageAdapter(
  environment: GarageEnvironment,
  dependencies: GarageAdapterDependencies = {},
): ObjectStore {
  const config = enabledEnvironment(environment);
  const client = createClient(config, dependencies.client);
  const createSignedUrl = dependencies.createSignedUrl ??
    ((s3Client, command, options) =>
      getSignedUrl(s3Client as S3Client, command as GetObjectCommand, options));
  const now = dependencies.now ?? (() => new Date());

  async function send<T>(command: object): Promise<T> {
    try {
      return await client.send(command) as T;
    } catch {
      throw unavailable();
    }
  }

  async function head(objectKey: string): Promise<ObjectMetadata | null> {
    if (!validObjectKey(objectKey)) throw unavailable();
    try {
      const response = await client.send(
        new HeadObjectCommand({ Bucket: config.bucket, Key: objectKey }),
      ) as HeadResponse;
      const metadata = requiredMetadata(response.Metadata, response.ContentLength);
      if (metadata === null) throw unavailable();
      return {
        ...metadata,
        etag: response.ETag,
        versionId: response.VersionId,
      };
    } catch (error) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
      if (statusCode === 404) return null;
      throw unavailable();
    }
  }

  return {
    head,
    async put(objectKey, bytes, metadata) {
      if (
        !validObjectKey(objectKey) ||
        !/^[a-f0-9]{64}$/.test(metadata.sha256) ||
        !Number.isSafeInteger(metadata.byteLength) ||
        metadata.byteLength <= 0 ||
        metadata.byteLength !== bytes.byteLength
      ) {
        throw unavailable();
      }
      await send<PutResponse>(new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        Body: bytes,
        ContentType: "application/pdf",
        Metadata: {
          sha256: metadata.sha256,
          bytelength: String(metadata.byteLength),
        },
      }));
      const verified = await head(objectKey);
      if (verified === null) throw unavailable();
      return verified;
    },

    async delete(objectKey) {
      if (!validObjectKey(objectKey)) throw unavailable();
      await send(new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }));
    },

    async createSignedDownload(objectKey, options): Promise<SignedDownload> {
      if (
        !validObjectKey(objectKey) ||
        !Number.isSafeInteger(options.expiresInSeconds) ||
        options.expiresInSeconds < MIN_SIGNED_DOWNLOAD_SECONDS ||
        options.expiresInSeconds > MAX_SIGNED_DOWNLOAD_SECONDS
      ) {
        throw unavailable();
      }
      try {
        const url = await createSignedUrl(
          client,
          new GetObjectCommand({ Bucket: config.bucket, Key: objectKey }),
          { expiresIn: options.expiresInSeconds },
        );
        const parsed = new URL(url);
        if (
          parsed.origin !== GARAGE_ORIGIN ||
          parsed.username ||
          parsed.password
        ) {
          throw unavailable();
        }
        return {
          url,
          expiresAt: new Date(now().getTime() + options.expiresInSeconds * 1000),
        };
      } catch {
        throw unavailable();
      }
    },
  };
}

export {
  MAX_SIGNED_DOWNLOAD_SECONDS,
  MIN_SIGNED_DOWNLOAD_SECONDS,
};
