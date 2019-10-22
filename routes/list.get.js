const fs = require('fs');
const cwd = process.cwd();
module.exports = async function({ res, data, config, htmlBuilder, style, remoteAddr, url }) {
	let user;
	if(!config.allowAll) {
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
	} else {
		user = { id: 0, approved: 1, activeIp: remoteAddr };
	}
	fs.readdir(`${cwd}/data/`, (e, r) => {
		if(e) {
			logger.error(`Error while read user data directory of ${user.id}: ${e.stack}`);
			res.statusCode = 500;
			return res.end(htmlBuilder.build('Error!', `Please contact to administrator with this error code: ${e.code} (File_IO)`));
		};
		let filesHtml = [];
		r.forEach(f => {
			f.startsWith(`${user.id}_`) && filesHtml.push(`<tr><td>${new Date(+f.substring(2, f.length - 4)).toISOString()}</td><td><a href="/view?f=${f.substring(0, f.length - 4)}">${f}</a></td><td><span onclick="print('${f.substring(0, f.length - 4)}', this)">Print</span></td>`);
		});
		if(!filesHtml.length) filesHtml.push('<tr><td colspan="3" style="text-align: center">No Files!</td></tr>');
		return res.end(htmlBuilder.build('Listing Files', `
			<script>
			async function print(id, element) {
				element.innerText = 'Please wait...';
				const response = await fetch('/api/print', {
					method: 'POST',
					body: JSON.stringify({
						f: id
					})
				});
				if((await response.json()).success) element.innerText = 'Success';
				else element.innerText = 'Failed';
			}

			async function save(id, element) {
				const response = await fetch('/api/save', {
					method: 'POST',
					body: JSON.stringify({
						type: 'pdf',
						f: id
					})
				});
				if((await response.json()).success) element.innerText = 'Success';
				else element.innerText = 'Failed';
			}

			async function updateIp(element) {
				const response = await fetch('/api/updateIp', {
					method: 'GET'
				});
				if((await response.json()).success) element.innerText = 'Updated';
				else element.innerText = 'Failed';
			}
			</script>
			<table>
			<tr><th style="width: 15%">Date</th><th style="width: 65%">Filename</th><th style="width: 20%">Menu</th>
			${filesHtml.join('')}
			</table>
			<i>Current Timezone: UTC</i><br>
			<i>Account Status: ${user.admin ? 'Admin User (<a href="/admin">Control Panel</a>)' : user.approved ? 'Normal User' : 'Pending Approval'}</i><br>
			<i>Your connection IP: ${remoteAddr}, Allowed Connection IP: <span${remoteAddr !== data.activeIp ? ' onclick="updateIp(this);"' : ''}>${user.activeIp ? user.activeIp : 'Unconfigured'}</span></i><br>
			<i>Made by Hoto-Cocoa. Copyright (C) 2019 Hoto-Cocoa, All Rights Reserved.</i><br>
			<i>This application's code under AGPLv3.0, Full license terms on <a href="https://www.gnu.org/licenses/agpl-3.0.en.html">GNU Site</a>.</i><br>
			<i><a href="/open-source-licenses">Open Source Licenses</a></i>
		`, style.table));
	});
}
