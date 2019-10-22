module.exports = function({ res, data, logger }) {
	if(data.auth && data.auth.admin && data.auth.approved) {
		logger.info(`Admin ${data.auth.username} stopped the server.`);
		res.end(JSON.stringify({ success: true }));
		return process.exit(0);
	} else {
		res.statusCode = 403;
		return res.end(JSON.stringify({ success: false, reason: 'NO_PERMISSION' }));
	}
}
