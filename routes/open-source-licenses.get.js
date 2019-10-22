module.exports = function({ res, htmlBuilder }) {
	return res.end(htmlBuilder.build('Open Source Licenses', `
		<h2>Open Source Licenses List of Cocoa-Printer-Server</h2>
		<p><a href="https://www.ghostscript.com/license.html">Ghostscript - License under AGPL v3.0</a></p>
	`));
}
