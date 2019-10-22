module.exports = function({ res, remoteAddr, db, config, data }) {
	if(!config.allowAll) {
		if(!data.auth) {
			res.statusCode = 401;
			return res.end(JSON.stringify({ success: false, reason: 'NEED_LOGIN' }));
		}
		db.query('UPDATE user SET activeIp=(?) WHERE id=(?)', remoteAddr, data.auth.id).then(() => {
			return res.end(JSON.stringify({ success: true }));
		});
	} else {
		res.statusCode = 400;
		return res.end(JSON.stringify({ success: false, reason: 'ALLOWALL_ENABLED' }));
	}
}
