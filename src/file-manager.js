import { resolve, isAbsolute, normalize } from 'path';
import { homedir } from 'os';
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';
import handleError from './handleError.js';
import printCurrentWorkingDirectory from './printWorkingDirChange.js';
import goToUpperDir from './up.js';
import printListOfFiles from './ls.js';
import addNewFile from './add.js';
import compressFile from './compress.js';
import decompressFile from './decompress.js';

process.chdir(homedir());

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
    goToUpperDir();
  } else if (trimmedLine === 'ls') {
    printListOfFiles();
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
    addNewFile(trimmedLine);
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
    compressFile(trimmedLine);
  } else if (trimmedLine.startsWith('decompress ')) {
    decompressFile(trimmedLine);
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