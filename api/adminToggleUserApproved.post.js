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
			if(data.auth.id === +body.userId) {
				res.statusCode = 400;
				return res.end(JSON.stringify({ success: false, reason: 'CANT_CHANGE_SELF' }));
			}
			db.query('UPDATE user SET approved = NOT approved WHERE id=(?);', body.userId).then(r => {
				logger.info(`Admin ${data.auth.username} toggled approved status of ${body.userId}.`);
				return res.end(JSON.stringify({ success: true }));
			}).catch((e) => {
				logger.error(`Error while toggle user approved status of ${body.userId}: ${e.stack}`);
				res.statusCode = 500;
				return res.end(JSON.stringify({ success: false, reason: 'DB_UPDATE', code: e.code }));
			});
		} else {
			res.statusCode = 403;
			return res.end(JSON.stringify({ success: false, reason: 'NO_PERMISSION' }));
		}
	});
}
