const fs = require('fs');
const cwd = process.cwd();
const gs = require('ghostscript4js');

module.exports = async function({ res, req, data, config, remoteAddr, logger, db }) {
	let user, body = '';
	req.on('data', d => body += d);
	req.on('end', () => {
		if(!body) {
			res.statusCode = 400;
			res.end(JSON.stringify({ success: false, reason: 'NO_DATA' }));
		}
		body = JSON.parse(body);
		if(!config.allowAll) {
			if(!data.auth) {
				res.statusCode = 401;
				return res.end(JSON.stringify({ success: false, reason: 'NEED_LOGIN' }));
			}
			user = data.auth;
			if((!+body.f.split('_')[0] && body.f.split('_')[0] !== '0') || !+body.f.split('_')[1]) {
				res.statusCode = 400;
				return res.end(JSON.stringify({ success: false, reason: 'INVALID_ARG_F' }));
			}
			if(((user.id !== +body.f.split('_')[0]) && !user.admin) || !user.approved) {
				res.statusCode = 403;
				return res.end(JSON.stringify({ success: false, reason: 'NO_PERMISSION' }));
			}
		} else {
			user = { id: 0 };
		}
		if(!body.f.match(/[0-9]*_[0-9]{13}/)) {
			res.statusCode = 400;
			return res.end(JSON.stringify({ success: false, reason: 'BAD_REQUEST' }));
		}
		fs.exists(`${cwd}/data/${body.f}.pdf`, async r => {
			if(r) {
				switch(process.platform) {
					case 'win32': {
						gs.execute(`-dPrinted -dBATCH -dNOPAUSE -dNOSAFER -dNumCopies=1 -sDEVICE=mswinpr2 -sPAPERSIZE=a4 -sOutputFile="%printer%${config.printerName}" "${cwd}/data/${body.f}.pdf"`).then(() => {
							logger.info(`${user.id}(${remoteAddr}) Printed ${body.f}.`);
							if(!config.allowAll) db.query('UPDATE user SET printCount=printCount+1 WHERE id=(?);', data.id);
							return res.end(JSON.stringify({ success: true }));
						}).catch(e => {
							logger.error(`Error while print file "${cwd}/data/${body.f}.pdf": ${e.stack}`);
							res.statusCode = 500;
							return res.end(JSON.stringify({ success: false, reason: 'GS_PRINT', code: e.code }));
						});
					} break;
					default: {
						let { stderr } = await require('util').promisify(require('child_process').exec)(`lp -d "${config.printerName}" "${cwd}/data/${body.f}.pdf"`, { stdio: 'inherit' }).catch(e => ({ stderr: e }));
						if(stderr) {
							logger.error(`Error while print file "${cwd}/data/${body.f}.pdf": ${stderr}`);
							res.statusCode = 500;
							return res.end(JSON.stringify({ success: false, reason: 'LP_PRINT', code: stderr }));
						}
						logger.info(`${user.id}(${remoteAddr}) Printed ${body.f}.`);
						if(!config.allowAll) db.query('UPDATE user SET printCount=printCount+1 WHERE id=(?);', data.id);
						return res.end(JSON.stringify({ success: true }));
					}
				}
			} else {
				res.statusCode = 404;
				return res.end(JSON.stringify({ success: false, reason: 'NO_FILE' }));
			}
		});
	});
}
