import { promises as fsPromises } from 'fs';
import printCurrentWorkingDirectory from './printWorkingDirChange.js';

const printListOfFiles = async () => {
  const currentDirectoryPath = process.cwd();

  try {
    const fileNames = await fsPromises.readdir(currentDirectoryPath);
    fileNames.sort();

    console.log('index | name | type');

    for (let index = 0; index < fileNames.length; index++) {
      const fileName = fileNames[index];
      const fileStats = await fsPromises.stat(`${currentDirectoryPath}/${fileName}`);
      const fileType = fileStats.isDirectory() ? '[Folder]' : '[File]';
      console.log(`${index + 1} | ${fileName} | ${fileType}`);
    }
  } catch (error) {
    console.error(`FS operation failed: ${error.message}`);
    throw error;
  }

  printCurrentWorkingDirectory();
};

export default printListOfFiles;