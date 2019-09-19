module.exports = class HTMLBuilder {
	constructor(style = '', head = '') {
		this.style = style;
		this.head = head;
	}

	build(title, body, style = '', head = '') {
		return `<title>${title}</title>${this.head}${head}<style>${this.styleBuild(style)}</style>${body}`.replace(/\s?(\n|\t)\s?/gm, '$1').replace(/(^\s*)/gm, '').replace(/>\s*/gm, '>');
	}
	
	styleBuild(style = '') {
		return `${this.style}${style}`.replace(/\s?(\{|\}|:|;|\n|,)\s?/gm, '$1').replace(/;}/gm, '}');
	}
}