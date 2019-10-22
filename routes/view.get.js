const fs = require('fs');
const cwd = process.cwd();
module.exports = function({ res, data, config, htmlBuilder, remoteAddr, url }) {
	const query = url.query;
	let user;
	if(!config.allowAll) {
		if(!data.auth) {
			res.statusCode = 401;
			return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
		}
		user = data.auth;
		if((!+query.f.split('_')[0] && query.f.split('_')[0] !== '0') || !+query.f.split('_')[1]) {
			res.statusCode = 400;
			return res.end(htmlBuilder.build('Error!', 'The needed argument was invalid: f'));
		}
		if((user.id !== +query.f.split('_')[0]) && !user.admin) {
			res.statusCode = 403;
			return res.end(htmlBuilder.build('Error!', `You hasn't permission to access to file: ${query.f}`));
		}
	} else {
		user = { id: 0, approved: 1, activeIp: remoteAddr };
	}
	fs.exists(`${cwd}/data/${query.f}.pdf`, r => {
		if(r) {
			fs.readFile(`${cwd}/data/${query.f}.pdf`, (e, c) => {
				if(e) {
					logger.error(`Error while read file to "${cwd}/data/${query.f}.pdf" serve content: ${e.stack}`);
					return res.end(htmlBuilder.build('Error!', `Please contact to administrator with this error code: ${e.code} (Serve_V)`));
				}
				res.writeHead(200, {
					'Content-Length': Buffer.byteLength(c),
					'Content-Type': 'application/pdf',
					'Content-Disposition': `filename="${query.f}.pdf"`
				});
				return res.end(c);
			});
		} else {
			res.statusCode = 404;
			return res.end(htmlBuilder.build('Error!', 'No such file!'));
		}
	});
}
