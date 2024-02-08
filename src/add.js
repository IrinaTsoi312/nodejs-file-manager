import fs from 'fs/promises';
import handleError from './handleError.js';

const addNewFile = async (trimmedLine) => {
  const newFileName = trimmedLine.slice('add '.length).trim();

  try {
    await fs.writeFile(newFileName, '');

    console.log(`File '${newFileName}' created successfully.`);
  } catch (error) {
    handleError(error);
  }
};

export default addNewFile;