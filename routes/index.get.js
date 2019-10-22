module.exports = function({ res, data, config, htmlBuilder, url }) {
	if(!config.allowAll) {
		if(data.auth) {
			res.statusCode = 302;
			res.setHeader('Location', '/list');
			return res.end(htmlBuilder.build('Redirecting...', 'Redirecting to <a href="/list">/list</a>...'));
		}
		return res.end(htmlBuilder.build(`Cocoa's Printer Server`, `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> or <a href="/register?return=${Buffer.from(url.pathname).toString('base64')}">register</a> to continue.`));
	} else {
		res.statusCode = 302;
		res.setHeader('Location', '/list');
		return res.end(htmlBuilder.build('Redirecting...', 'Redirecting to <a href="/list">/list</a>...'));
	}
}
