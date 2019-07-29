const cwd = process.cwd();

module.exports = class Database {
	constructor(filename, logger) {
		const SQLite3 = require('sqlite3')
		this.db = new SQLite3.Database(filename);
		this.logger = logger;
		const Sequelize = require('sequelize'), sequelize = new Sequelize('', '', '', { dialect: 'sqlite', storage: `${cwd}/${filename}`, logging: (msg) => logger.debug('Database Query: "%s"', msg.substring(21)) }), queryInterface = sequelize.getQueryInterface();
		queryInterface.createTable('user', {
			id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
			createdAt: { type: Sequelize.BIGINT, allowNull: false },
			email: { type: Sequelize.CHAR(255), allowNull: false, uniqueKey: true },
			username: { type: Sequelize.CHAR(31), uniqueKey: true },
			password: { type: Sequelize.TEXT, allowNull: false },
			approved: { type: Sequelize.BOOLEAN, defaultValue: false },
			admin: { type: Sequelize.BOOLEAN, defaultValue: false },
			activeIp: { type: Sequelize.TEXT },
			pdfCount: { type: Sequelize.INTEGER, defaultValue: 0 },
			printCount: { type: Sequelize.INTEGER, defaultValue: 0 }
		});
	}

	query(sql, ...args) {
		this.logger.debug(`Database Query: "${sql}"${args.length ? `, with params[${args.join(', ')}]` : ''}`);
		return new Promise((resolve, reject) => this.db.prepare(sql).all(args, (e, r) => e ? reject(e) : r.length === 1 ? Object.keys(r[0]).length === 1 ? resolve(r[0][Object.keys(r[0])[0]]) : resolve(r[0]) : r.length === 0 ? resolve(false) : resolve(r)).finalize());
	}

	queryRaw(sql, ...args) {
		this.logger.debug(`Database Query: "${sql}"${args.length ? `, with params[${args.join(', ')}]` : ''}`);
		return new Promise((resolve, reject) => this.db.prepare(sql).all(args, (e, r) => e ? reject(e) : resolve(r)));
	}
}
