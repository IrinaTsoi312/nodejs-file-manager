import { resolve, isAbsolute, normalize } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { homedir } from 'os';
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';

import handleOperationError from './handleOperationError.js';


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
    handleOperationError(error);
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
      handleOperationError(error);
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
      handleOperationError(error);
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
      handleOperationError(error);
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
        handleOperationError(error);
      });
    } catch (error) {
      handleOperationError(error);
    }
  } else if (trimmedLine.startsWith('add ')) {
    const newFileName = trimmedLine.slice('add '.length).trim();

    try {
      await fs.writeFile(newFileName, '');

      console.log(`File '${newFileName}' created successfully.`);
    } catch (error) {
      handleOperationError(error);
    }
  } else if (trimmedLine.startsWith('rn ')) {
    const [oldFilePath, newFileName] = trimmedLine.slice('rn '.length).trim().split(' ');

    try {
      await fs.rename(oldFilePath, newFileName);

      console.log(`File '${oldFilePath}' renamed to '${newFileName}' successfully.`);
    } catch (error) {
      handleOperationError(error);
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
        handleOperationError(error);
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
          handleOperationError(error);
        });
      } catch (error) {
        handleOperationError(error);
      }
    } else {
      console.log('Unknown command. Please enter a valid command.');
    }
  }

  printCurrentWorkingDirectory();

  rl.prompt();
});