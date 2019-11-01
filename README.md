## Cocoa-Printer-Server
Bypass printer restrictions, Save any document to PDF. Make your USB Printer to Network Printer. Supported any Operating System that support network printer.

## Installation
You need GhostScript. Version 9.20 and 9.23 Tested, 9.20 will NOT work. Please use 9.23 or above.
1. Clone this repository.
1. Install the modules by `npm i`.
1. Save configure to `config.json` with below format.
	```
	{
		"printerName": "Printer name on system. If not provided, will try default printer.",
		"encryptKey": "32-byte Encrypt Key to use to AES-256 Encrypt."
	}
	```
1. Type `npm start` to start application.
1. Open [127.0.0.1:8080](http://127.0.0.1:8080) or ServerIp:8080, and register to site. The application will give admin permission to first user.
1. Add printer to your system. You may see error message like "Printer not responding", Just ignore that and continue. Please select driver that uses PostScript like "Microsoft PS Class Driver". If you are planing to use this application to bypass printer restriction, Please install driver that approved in that site. If you select driver that not PostScript driver, This application will drop your print.

You may need make 8080 port and 9100 port open. Please allow network connection If System Firewall or Anti-Virus asks for allow that.

## More Configuration
If you want passthru mode? Or No IP Filtering for Internal Network? You can add configuration value to that.
* If you set "passthru" to true, The server not saving any requests to file, Just print document and delete temporary file.
* If you set "allowAll" to true, The server not filtering any IP and make accessible from any IP addresses to any document. You can use passthru mode to block see other people see document by not saving PDF file.

## Build
```
npm run pkg
npm run copy-dep-node
```
Executable file will create in `dists` directory.

## Contribution
If any questions or problems? Please open Issue! I will support your questions or problems.
