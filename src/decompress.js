import { createBrotliDecompress } from 'zlib';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';

const decompressFile = async (trimmedLine) => {
  const [filePathToDecompress, destinationPath] = trimmedLine.slice('decompress '.length).trim().split(' ');

  try {
    const normalizedPath = filePathToDecompress.replace(/\//g, path.sep);

    const readStream = createReadStream(normalizedPath);
    const writeStream = createWriteStream(destinationPath);

    const brotliDecompress = createBrotliDecompress();

    readStream.pipe(brotliDecompress).pipe(writeStream);

    writeStream.on('finish', () => {
      console.log(`File decompressed successfully to: ${destinationPath}`);
    });

    writeStream.on('error', (error) => {
      console.error(`Operation failed: ${error}`);
    });
  } catch (error) {
    console.error(`Operation failed: ${error}`);
  }
};

export default decompressFile;