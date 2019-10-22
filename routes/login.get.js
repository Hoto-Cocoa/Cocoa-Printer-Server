module.exports = function({ res, config, htmlBuilder }) {
	if(config.allowAll) {
		res.statusCode = 302;
		res.setHeader('Location', '/list');
		return res.end(htmlBuilder.build('Redirecting...', 'Redirecting to <a href="/list">/list</a>...'));
	}
	return res.end(htmlBuilder.build('Login',
		`<form method="POST">
		Username:<br>
		<input id="username" name="username" type="username"><br>
		Password:<br>
		<input id="password" name="password" type="password"><br><br>
		<button type="submit">Login!</button>`
	));
}
