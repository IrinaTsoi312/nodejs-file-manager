import withTemporaryDirectoryChange from './withTemporaryDirChange.js';
import fs from 'fs/promises';
import { resolve } from 'path';

const printListOfFiles = async (workingDir) => {
  try {
    process.chdir(workingDir);
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
    console.error(`Operation failed: ${error}`);
  }
};

export default printListOfFiles;