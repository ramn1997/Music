const fs = require('fs');
const path = 'src/hooks/PlayerContext.tsx';
try {
    const data = fs.readFileSync(path, 'utf8');
    const lines = data.split('\n');
    console.log('--- LINES 170-180 ---');
    for (let i = 169; i < 180; i++) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
} catch (err) {
    console.error(err);
}
