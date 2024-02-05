import { resolve } from 'path';
import { homedir } from 'os';
import readline from 'readline';
import fs from 'fs/promises';

const printCurrentWorkingDirectory = () => {
  console.log(`You are currently in ${process.cwd()}`);
};

const handleOperationError = (error) => {
  console.error(`Operation failed: ${error.message}`);
};

process.chdir(homedir());

const username = process.env.npm_config_username;

if (username) {
  console.log(`Welcome to the File Manager, ${username}!`);
} else {
  console.error("Please provide a username using the --username argument.");
}

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

rl.on('line', async (line) => {
  const trimmedLine = line.trim();

  if (trimmedLine === '.exit') {
    console.log(`Thank you for using File Manager, ${username}, goodbye!`);
    process.exit();
  } else if (trimmedLine === 'pwd') {
    printCurrentWorkingDirectory();
  } else if (trimmedLine.startsWith('readFile ')) {
    const filePath = trimmedLine.slice('readFile '.length).trim();

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      console.log(`File content: ${content}`);
    } catch (error) {
      handleOperationError(error);
    }
  } else {
    console.log('Unknown command. Please enter a valid command.');
  }

  printCurrentWorkingDirectory();

  rl.prompt();
});