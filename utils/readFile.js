import fs from 'fs';

function readFile(filepath) {
    try {
        return fs.readFileSync(filepath);
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
}

export default readFile;