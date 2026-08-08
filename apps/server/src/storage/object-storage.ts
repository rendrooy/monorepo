export interface GetObjectInput {
  bucket: string;
  key: string;
}

export interface ObjectStorage {
  assertBucketAccess(bucket: string): Promise<void>;
  deleteObject(input: GetObjectInput): Promise<void>;
  getObject(input: GetObjectInput): Promise<Buffer>;
  putObject(input: PutObjectInput): Promise<void>;
}

export interface PutObjectInput {
  body: Buffer;
  bucket: string;
  checksumSha256: string;
  contentType: string;
  key: string;
}
