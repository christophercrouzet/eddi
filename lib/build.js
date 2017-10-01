const path = require('path');

const { defaultCallback, dirExistsSync } = require('./utils');


const TASKS_PATH = path.join(__dirname, 'tasks');


module.exports = (sourcePath, destinationPath, options, taskName = 'all') => {
  if (!dirExistsSync(sourcePath)) {
    throw new Error(`${sourcePath}: No such source directory`);
  } else if (!dirExistsSync(destinationPath)) {
    throw new Error(`${destinationPath}: No such destination directory`);
  }

  const task = require(path.join(TASKS_PATH, taskName));
  return task(sourcePath, destinationPath, options, defaultCallback);
};
