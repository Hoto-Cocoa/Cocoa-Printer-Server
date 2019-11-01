const fs = require('fs');
const cwd = process.cwd();
module.exports = async function({ res, data, config, htmlBuilder, style, db, url }) {
	let user;
	if(config.allowAll) {
		res.setHeader('Location', '/list');
		res.statusCode = 302;
		return res.end(htmlBuilder.build('Redirecting...', 'Redirecting to <a href="/list">/list</a>...'));
	}
	if(!data.auth) {
		res.statusCode = 401;
		return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
	}
	user = data.auth;
	if(!user.id) {
		res.statusCode = 401;
		return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
	}
	if(!+user.id) {
		res.statusCode = 400;
		return res.end(htmlBuilder.build('Invalid User ID!', `Please contact to administrator with this error code: E_ID${user.id}`));
	}
	if(!user.admin || !user.approved) {
		res.statusCode = 403;
		return res.end(htmlBuilder.build('Need permission!', 'Administrator permission needed to access this page.'));
	}
	const userList = await db.queryRaw('SELECT * FROM user;');
	fs.readdir(`${cwd}/data/`, (e, r) => {
		if(e) {
			logger.error(`Error while read user data directory: ${e.stack}`);
			res.statusCode = 500;
			return res.end(htmlBuilder.build('Error!', `Error code: ${e.code} (File_IO)`));
		};
		let filesHtml = [];
		r.forEach(f => {
			filesHtml.push(`<tr><td>${new Date(+f.substring(2, f.length - 4)).toISOString()}</td><td><a href="/view?f=${f.substring(0, f.length - 4)}">${f}</a></td><td><a href="/save?f=${f.substring(0, f.length - 4)}&type=pdf">Download</a> | <a href="/print?f=${f.substring(0, f.length - 4)}">Print</a></td>`);
		});
		if(!filesHtml.length) filesHtml.push('<tr><td colspan="3" style="text-align: center">No Files!</td></tr>');
		return res.end(htmlBuilder.build(`Cocoa's Printer Server Control Panel`, `
			<script>
			async function toggle(type, id, element) {
				const response = await fetch(\`/api/adminToggle\${type}\`, {
					method: 'POST',
					body: JSON.stringify({
						userId: id
					})
				});
				if((await response.json()).success) element.innerText = !(element.innerText === 'true');
			}

			async function updateIp(id, element) {
				const ip = prompt(\`Please enter new IP of User ID: \${id}\`);
				if(ip) {
					const response = await fetch('/api/adminUpdateIp', {
						method: 'POST',
						body: JSON.stringify({
							userId: id,
							ip
						})
					});
					if((await response.json()).success) element.innerText = ip;
				}
			}
			</script>
			<h2>Welcome to Cocoa's Printer Server Control Panel!</h2>
			<a href="../list">Return to List</a> | <a href="/admin?action=stop">Stop server</a>
			<table>
				<caption>User List<caption>
				<tr>
					<th>ID</th>
					<th>Date</th>
					<th>Email</th>
					<th>Username</th>
					<th>Approved</th>
					<th>Admin</th>
					<th>Active IP</th>
					<th>PDF Count</th>
					<th>Print Count</th>
				</tr>
				${userList.map(e =>
					`<tr>
						<td>${e.id}</td>
						<td>${new Date(e.createdAt).toISOString()}</td>
						<td>${decodeURIComponent(e.email)}</td>
						<td>${e.username}</td>
						<td><span${user.id !== e.id && ` onclick="toggle('UserApproved', ${e.id}, this)"`}>${!!e.approved}</span></td>
						<td><span${user.id !== e.id && ` onclick="toggle('UserAdmin', ${e.id}, this)"`}">${!!e.admin}</span></td>
						<td><span onclick="updateIp(${e.id}, this)">${e.activeIp}</span></td>
						<td>${e.pdfCount}</td>
						<td>${e.printCount}</td>
					</tr>`
				).join('')}
			</table>
			<br>
			<table>
				<caption>File List<caption>
				<tr><th style="width: 15%">Date</th><th style="width: 65%">Filename</th><th style="width: 20%">Menu</th>
				${filesHtml.join('')}
			</table>
		`, style.table));
	});
}
