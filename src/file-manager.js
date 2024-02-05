import { resolve, isAbsolute, normalize } from 'path';
import { homedir } from 'os';
import readline from 'readline';
import fs from 'fs/promises';

import handleOperationError from './handleOperationError.js';

const printCurrentWorkingDirectory = () => {
  console.log(`You are currently in ${process.cwd()}`);
};

const withTemporaryDirectoryChange = async (targetDir, callback) => {
  const originalDir = process.cwd();
  try {
    const absolutePath = resolve(targetDir);

    if (targetDir.split(':')[0] !== originalDir.split(':')[0]) {
      console.log(`Changing drive to ${targetDir.split(':')[0]}`);
      process.chdir(targetDir.split(':')[0] + ':\\');
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
      const currentModuleDir = new URL('.', import.meta.url).pathname;
      const projectDir = resolve(currentModuleDir, '../..');

      const currentWorkingDir = process.cwd();
      const targetDir = resolve(currentWorkingDir, projectDir, 'src', 'files');

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
    } else {
      console.log('Unknown command. Please enter a valid command.');
    }
  }

  printCurrentWorkingDirectory();

  rl.prompt();
});