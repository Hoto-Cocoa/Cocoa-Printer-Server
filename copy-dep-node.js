const fs = require('fs');
fs.readdir(`${__dirname}/node_modules/sqlite3/lib/binding/`, (e, f) => e ? console.error(e) : fs.copyFile(`${__dirname}/node_modules/sqlite3/lib/binding/${f[0]}/node_sqlite3.node`, `${__dirname}/dists/node_sqlite3.node`, e => e && console.error(e)));
fs.copyFile(`${__dirname}/node_modules/ghostscript4js/build/Release/ghostscript4js.node`, `${__dirname}/dists/ghostscript4js.node`, e => e && console.error(e));
if(process.platform === 'win32') fs.copyFile(`${__dirname}/node_modules/ghostscript4js/build/Release/gsdll64.dll`, `${__dirname}/dists/gsdll64.dll`, e => e && console.error(e));
