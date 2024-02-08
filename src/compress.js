import path from 'path';
import { createReadStream, createWriteStream, promises as fsPromises, readdir } from 'fs';
import { createBrotliCompress } from 'zlib';

const compressFile = async (trimmedLine) => {
  const [sourcePath, destinationPath] = trimmedLine.slice('compress '.length).trim().split(' ');

  try {
    const normalizedSourcePath = sourcePath.replace(/\//g, path.sep);
    const isSourceDirectory = (await fsPromises.lstat(normalizedSourcePath)).isDirectory();

    if (isSourceDirectory) {
      const files = await readdir(normalizedSourcePath);

      for (const file of files) {
        const filePath = path.join(normalizedSourcePath, file);
        const readStream = createReadStream(filePath);
        const destinationFile = path.join(destinationPath, `${file}.br`);
        const writeStream = createWriteStream(destinationFile);
        const brotliCompress = createBrotliCompress();

        readStream.pipe(brotliCompress).pipe(writeStream);
        writeStream.on('finish', () => {
          console.log(`File ${filePath} compressed successfully to: ${destinationFile}`);
        });
        writeStream.on('error', (error) => {
          console.error(`Operation failed: ${error}`);
        });
      }
      console.log(`Directory compressed successfully to: ${destinationPath}`);
    } else {
      const readStream = createReadStream(normalizedSourcePath);
      const isDestinationDirectory = destinationPath.endsWith(path.sep);
      const destinationFile = isDestinationDirectory ? `${destinationPath}${path.basename(normalizedSourcePath)}.br` : destinationPath;
      const writeStream = createWriteStream(destinationFile);
      const brotliCompress = createBrotliCompress();

      readStream.pipe(brotliCompress).pipe(writeStream);
      writeStream.on('finish', () => {
        console.log(`File compressed successfully to: ${destinationFile}`);
      });

      writeStream.on('error', (error) => {
        console.error(`Operation failed: ${error}`);
      });
    }
  } catch (error) {
    console.error(`Operation failed: ${error}`);
  }
};

export default compressFile;