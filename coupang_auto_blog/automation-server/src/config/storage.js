import { Client } from 'minio';

let minioClient = null;

/**
 * MinIO 클라이언트 초기화
 */
export function initializeStorage() {
  if (minioClient) {
    console.log('✅ MinIO already initialized');
    return minioClient;
  }

  const endpoint = process.env.MINIO_ENDPOINT || 'localhost:9000';
  const [host, port] = endpoint.split(':');

  minioClient = new Client({
    endPoint: host,
    port: parseInt(port) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
  });

  console.log(`✅ MinIO client initialized: ${endpoint}`);
  return minioClient;
}

/**
 * MinIO 클라이언트 가져오기
 */
export function getStorage() {
  if (!minioClient) {
    return initializeStorage();
  }
  return minioClient;
}

/**
 * 버킷 생성
 */
export async function ensureBucket(bucketName) {
  try {
    const client = getStorage();
    const exists = await client.bucketExists(bucketName);

    if (!exists) {
      await client.makeBucket(bucketName, 'us-east-1');
      console.log(`✅ Bucket created: ${bucketName}`);

      // 퍼블릭 읽기 정책 설정
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };

      await client.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`✅ Bucket policy set: ${bucketName}`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Bucket creation failed: ${bucketName}`, error.message);
    return false;
  }
}

/**
 * 파일 업로드
 */
export async function uploadFile(bucketName, fileName, filePath, contentType) {
  try {
    const client = getStorage();
    await ensureBucket(bucketName);

    const metaData = {
      'Content-Type': contentType || 'application/octet-stream',
    };

    await client.fPutObject(bucketName, fileName, filePath, metaData);
    console.log(`✅ File uploaded: ${bucketName}/${fileName}`);

    return {
      success: true,
      url: `/storage/${bucketName}/${fileName}`,
    };
  } catch (error) {
    console.error('❌ File upload failed:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 버퍼 업로드 (메모리에서 직접)
 */
export async function uploadBuffer(bucketName, fileName, buffer, contentType) {
  try {
    const client = getStorage();
    await ensureBucket(bucketName);

    const metaData = {
      'Content-Type': contentType || 'application/octet-stream',
    };

    await client.putObject(bucketName, fileName, buffer, buffer.length, metaData);
    console.log(`✅ Buffer uploaded: ${bucketName}/${fileName}`);

    return {
      success: true,
      url: `/storage/${bucketName}/${fileName}`,
    };
  } catch (error) {
    console.error('❌ Buffer upload failed:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 파일 삭제
 */
export async function deleteFile(bucketName, fileName) {
  try {
    const client = getStorage();
    await client.removeObject(bucketName, fileName);
    console.log(`✅ File deleted: ${bucketName}/${fileName}`);
    return true;
  } catch (error) {
    console.error('❌ File deletion failed:', error.message);
    return false;
  }
}

/**
 * 초기화: 기본 버킷 생성
 */
export async function initializeBuckets() {
  await ensureBucket('images');      // 상품 이미지
  await ensureBucket('documents');   // 문서
  await ensureBucket('backups');     // 백업
  console.log('✅ All buckets initialized');
}
