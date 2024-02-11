import handleError from './handleError.js';
import { normalize } from 'path';

const goToUpperDir = async () => {
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
};

export default goToUpperDir;