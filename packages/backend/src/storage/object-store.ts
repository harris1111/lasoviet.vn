export type ObjectMetadata = {
  sha256: string;
  byteLength: number;
  etag?: string;
  versionId?: string;
};

export type SignedDownload = {
  url: string;
  expiresAt: Date;
};

export interface ObjectStore {
  head(objectKey: string): Promise<ObjectMetadata | null>;
  put(
    objectKey: string,
    bytes: Uint8Array,
    metadata: Pick<ObjectMetadata, "sha256" | "byteLength">,
  ): Promise<ObjectMetadata>;
  delete(objectKey: string): Promise<void>;
  createSignedDownload(
    objectKey: string,
    options: { expiresInSeconds: number },
  ): Promise<SignedDownload>;
}
