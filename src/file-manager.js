import { resolve, isAbsolute, normalize } from 'path';
import { createReadStream, createWriteStream, promises as fsPromises, readdir } from 'fs';
import { homedir } from 'os';
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';
import handleError from './handleError.js';
import { createBrotliCompress, createBrotliDecompress } from 'zlib';


const workingDir = process.cwd();

const printCurrentWorkingDirectory = () => {
  console.log(`You are currently in ${process.cwd()}`);
};

const withTemporaryDirectoryChange = async (targetDir, callback) => {
  const originalDir = process.cwd();
  try {
    const absolutePath = path.resolve(targetDir);
    const targetDrive = path.parse(absolutePath).root;

    if (targetDrive.toLowerCase() !== originalDir.slice(0, 1).toLowerCase()) {
      console.log(`Changing drive to ${targetDrive}`);
      process.chdir(targetDrive);
    }

    process.chdir(absolutePath);

    await callback();
  } catch (error) {
    handleError(error);
  } finally {
    process.chdir(originalDir);
  }
};
process.chdir(homedir());
process.chdir(workingDir);

const username = process.env.npm_config_username;

console.log(`Welcome to the File Manager, ${username}!`);

printCurrentWorkingDirectory();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

rl.on('SIGINT', () => {
  console.log(`Thank you for using File Manager, ${username}, goodbye!`);
  process.exit();
});

if (process.platform === 'win32') {
  rl.on('SIGINT', () => {
    process.emit('SIGINT');
  });
}

rl.prompt();

rl.on('SIGINT', () => {
  console.log(`Thank you for using File Manager, ${username}, goodbye!`);
  process.exit();
});

if (process.platform === 'win32') {
  rl.on('SIGINT', () => {
    process.emit('SIGINT');
  });
}

rl.prompt();

rl.on('line', async (line) => {
  const trimmedLine = line.trim();

  if (trimmedLine === '.exit') {
    console.log(`Thank you for using File Manager, ${username}, goodbye!`);
    process.exit();
  } else if (trimmedLine === 'pwd') {
    printCurrentWorkingDirectory();
  } else if (trimmedLine.startsWith('cd ')) {
    const requestedDir = trimmedLine.slice('cd '.length).trim();

    try {
      const targetDir = isAbsolute(requestedDir)
        ? requestedDir
        : resolve(process.cwd(), requestedDir);

      if (normalize(targetDir).startsWith(normalize(process.cwd().split(':')[0] + ':\\'))) {
        process.chdir(targetDir);
        console.log(`Changed current working directory to: ${targetDir}`);
      } else {
        console.log('Invalid directory. Cannot navigate above the root directory.');
      }
    } catch (error) {
      handleError(error);
    }
  } else if (trimmedLine === 'up') {
    try {
      const currentDir = normalize(process.cwd());
      const rootDir = normalize(process.cwd().split(':')[0] + ':\\');

      if (currentDir !== rootDir) {
        process.chdir('..');
        console.log(`Moved up one level. Current working directory is now: ${process.cwd()}`);
      } else {
        console.log('Already in the root directory. Cannot move up.');
      }
    } catch (error) {
      handleError(error);
    }
  } else if (trimmedLine === 'ls') {
    try {
      const projectDir = resolve(workingDir, '../..');
      const targetDir = resolve(projectDir, 'src', 'files');

      await withTemporaryDirectoryChange(targetDir, async () => {
        const contents = await fs.readdir('./');
        const sortedContents = contents.sort(async (a, b) => {
          const isDirectoryA = (await fs.stat(resolve(targetDir, a))).isDirectory();
          const isDirectoryB = (await fs.stat(resolve(targetDir, b))).isDirectory();

          if (isDirectoryA && !isDirectoryB) {
            return -1;
          } else if (!isDirectoryA && isDirectoryB) {
            return 1;
          } else {
            return a.localeCompare(b, undefined, { sensitivity: 'base' });
          }
        });
        console.log('Type\tName');
        for (const item of sortedContents) {
          const isDirectory = (await fs.stat(resolve(targetDir, item))).isDirectory();
          console.log(`${isDirectory ? 'Folder' : 'File'}\t${item}`);
        }
      });
    } catch (error) {
      handleError(error);
    }
  } else if (trimmedLine.startsWith('cat ')) {
    const filePath = trimmedLine.slice('cat '.length).trim();

    try {
      const fileStream = createReadStream(filePath);

      fileStream.on('data', (chunk) => {
        process.stdout.write(chunk);
      });

      fileStream.on('end', () => {
        console.log('\nFile reading completed.');
      });

      fileStream.on('error', (error) => {
        handleError(error);
      });
    } catch (error) {
      handleError(error);
    }
  } else if (trimmedLine.startsWith('add ')) {
    const newFileName = trimmedLine.slice('add '.length).trim();

    try {
      await fs.writeFile(newFileName, '');

      console.log(`File '${newFileName}' created successfully.`);
    } catch (error) {
      handleError(error);
    }
  } else if (trimmedLine.startsWith('rn ')) {
    const [oldFilePath, newFileName] = trimmedLine.slice('rn '.length).trim().split(' ');

    try {
      await fs.rename(oldFilePath, newFileName);

      console.log(`File '${oldFilePath}' renamed to '${newFileName}' successfully.`);
    } catch (error) {
      handleError(error);
    }
  } else if (trimmedLine.startsWith('mv ')) {
    const [sourceFilePath, destinationPath] = trimmedLine.slice('mv '.length).trim().split(' ');

    try {
      const sourceStream = createReadStream(sourceFilePath);
      const destinationStream = createWriteStream(destinationPath);

      sourceStream.pipe(destinationStream);

      sourceStream.on('end', async () => {
        console.log(`File '${sourceFilePath}' moved to '${destinationPath}' successfully.`);

        try {
          await fs.unlink(sourceFilePath);
          console.log(`Source file '${sourceFilePath}' deleted successfully.`);
        } catch (error) {
          handleError(error);
        }
      });

      sourceStream.on('error', (error) => {
        handleError(error);
      });
    } catch (error) {
      handleError(error);
    }
  } else if (trimmedLine.startsWith('rm ')) {
    const filePathToRemove = trimmedLine.slice('rm '.length).trim();

    try {
      const normalizedPath = filePathToRemove.replace(/\//g, path.sep);

      await fs.unlink(normalizedPath);
      console.log(`File '${normalizedPath}' deleted successfully.`);
    } catch (error) {
      handleError(error);
    }
  } else if (trimmedLine === 'os --EOL') {
    const { EOL } = os;
    console.log(`Default End-Of-Line (EOL) on this system is: '${EOL}'`);
  } else if (trimmedLine === 'os --cpus') {
    const cpus = os.cpus();
    console.log(`Overall amount of CPUs: ${cpus.length}`);

    cpus.forEach((cpu, index) => {
      console.log(`CPU ${index + 1}:`);
      console.log(`  Model: ${cpu.model}`);
      console.log(`  Clock rate: ${cpu.speed / 1000} GHz`);
    });
  } else if (trimmedLine === 'os --homedir') {
    const homeDirectory = os.homedir();
    console.log(`Home directory: ${homeDirectory}`);
  } else if (trimmedLine === 'os --username') {
    const systemUsername = os.userInfo().username;
    console.log(`System username: ${systemUsername}`);
  } else if (trimmedLine === 'os --architecture') {
    const cpuArchitecture = os.arch();
    console.log(`Node.js binary compiled for CPU architecture: ${cpuArchitecture}`);
  } else if (trimmedLine.startsWith('hash ')) {
    const filePathToHash = trimmedLine.slice('hash '.length).trim();

    try {
      const normalizedPath = filePathToHash.replace(/\//g, path.sep);

      const hash = createHash('sha256');
      const fileStream = createReadStream(normalizedPath);

      fileStream.on('data', (chunk) => {
        hash.update(chunk);
      });

      fileStream.on('end', () => {
        const fileHash = hash.digest('hex');
        console.log(`Hash for file '${normalizedPath}': ${fileHash}`);
      });

      fileStream.on('error', (error) => {
        handleError(error);
      });
    } catch (error) {
      handleError(error);
    }
  } else if (trimmedLine.startsWith('compress ')) {
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
            handleError(error);
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
          handleError(error);
        });
      }
    } catch (error) {
      handleError(error);
    }
  } else if (trimmedLine.startsWith('decompress ')) {
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
        handleError(error);
      });
    } catch (error) {
      handleError(error);
    }
  } else {
    if (trimmedLine.startsWith('cd ')) {
      const requestedDir = trimmedLine.slice('cd '.length).trim();

      try {
        const targetDir = isAbsolute(requestedDir)
          ? requestedDir
          : resolve(process.cwd(), requestedDir);

        process.chdir(targetDir);
        console.log(`Changed current working directory to: ${targetDir}`);
      } catch (error) {
        handleError(error);
      }
    } else if (trimmedLine.startsWith('cp ')) {
      const [sourceFilePath, destinationPath] = trimmedLine.slice('cp '.length).trim().split(' ');

      try {
        const sourceStream = createReadStream(sourceFilePath);
        const destinationStream = createWriteStream(destinationPath);

        sourceStream.pipe(destinationStream);

        sourceStream.on('end', () => {
          console.log(`File '${sourceFilePath}' copied to '${destinationPath}' successfully.`);
        });

        sourceStream.on('error', (error) => {
          handleError(error);
        });
      } catch (error) {
        handleError(error);
      }
    } else {
      console.log('Unknown command. Please enter a valid command.');
    }
  }

  printCurrentWorkingDirectory();

  rl.prompt();
});