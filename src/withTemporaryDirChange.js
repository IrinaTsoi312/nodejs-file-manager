import path from 'path';

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

export default withTemporaryDirectoryChange;