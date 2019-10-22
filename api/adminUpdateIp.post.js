module.exports = function({ res, req, logger, data, db }) {
	let body = '';
	req.on('data', d => body += d);
	req.on('end', () => {
		if(!body) {
			res.statusCode = 400;
			res.end(JSON.stringify({ success: false, reason: 'NO_DATA' }));
		}
		body = JSON.parse(body);
		if(data.auth && data.auth.admin && data.auth.approved) {
			if(!+body.userId) {
				res.statusCode = 400;
				return res.end(JSON.stringify({ success: false, reason: 'INVALID_ARG_USERID' }));
			}
			db.query('UPDATE user SET activeIp=(?) WHERE id=(?);', body.ip, body.userId).then(r => {
				logger.info(`Admin ${data.auth.username} changed active ip address of ${body.userId} to ${body.ip}.`);
				return res.end(JSON.stringify({ success: true }));
			}).catch((e) => {
				logger.error(`Error while change user active ip of ${body.userId} to ${body.ip}: ${e.stack}`);
				res.statusCode = 500;
				return res.end(JSON.stringify({ success: false, reason: 'DB_UPDATE', code: e.code }));
			});
		} else {
			res.statusCode = 403;
			return res.end(JSON.stringify({ success: false, reason: 'NO_PERMISSION' }));
		}
	});
}
