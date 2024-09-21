import fs from 'fs';

/**
 * Reads a file from the local file system.
 * 
 * @param {string} filePath - The path to the file on the local system.
 * @returns {Promise<Buffer>} A promise that resolves with the content of the file as a buffer.
 * @throws Will throw an error if the file cannot be read.
 */
function readFile(filepath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filepath, (error, data) => {
            if (error) {
                console.error('Error reading file:', error);
                reject(error);
            } else {
                resolve(data);
            }
        });
    });
}

export default readFile;