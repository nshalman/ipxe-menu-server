#!/usr/bin/env node
var dashdash = require('dashdash');
var  restify = require('restify');
var     path = require('path');
var       fs = require('fs');

var options = [
    {
        name: 'version',
        type: 'bool',
        help: 'Print tool version and exit.'
    },
    {
        names: ['help', 'h'],
        type: 'bool',
        help: 'Print this help and exit.'
    },
    {
        names: ['verbose', 'v'],
        type: 'arrayOfBool',
        env: 'BOOTSERVER_VERBOSE',
        help: 'Verbose output. Use multiple times for more verbose.'
    },
    {
        names: ['directory', 'd'],
        type: 'string',
        env: 'BOOTSERVER_DIRECTORY',
        help: 'Directory to serve',
        helpArg: 'DIR'
    },
    {
        names: ['port', 'p'],
        type: 'number',
        env: 'BOOTSERVER_PORT',
        help: 'IP Port to serve on',
        helpArg: 'PORT'
    }
];

var parser = dashdash.createParser({options: options});
try {
    var opts = parser.parse(process.argv);
} catch (e) {
    console.error('server: error: %s', e.message);
    process.exit(1);
}

if (opts.help) {
    var help = parser.help({includeEnv: true}).trimRight();
    console.log('usage: node server.js [OPTIONS]\n'
                + 'options:\n'
                + help);
    process.exit(0);
}

console.log("# opts:", opts);
console.log("# args:", opts._args);

var serve_dir;
if (opts.directory){
	serve_dir = opts.directory;
}
else {
	serve_dir = process.cwd();
}

var serve_port = 80;
if (opts.port){
	serve_port = opts.port;
}

function menu_entry(dirname) {
	var arg_file = path.join(serve_dir, dirname, '/args');
	var desc_file = path.join(serve_dir, dirname, '/desc');
	var entry = "";
	try { entry += " " + fs.readFileSync(desc_file);}
	catch (e) {}
	entry += 'kernel ';
	entry += dirname;
	entry += '/kernel';
	try { entry += " " + fs.readFileSync(arg_file);}
	catch (e) {}
	entry += 'initrd ';
	entry += dirname;
	entry += '/initrd';
	entry += '\n\n';
	return entry
}

function menu(req, res, next) {
	var everything = [];
	fs.readdir(serve_dir, function (err, dirlist) {
		if (err) {
			res.send(500, 'Internal Server Error');
			return next();
		}
		else {
			var menu = "";
			for (entry in dirlist) {
				menu += menu_entry(dirlist[entry]);
			};
			res.contentType = "text";
			res.send(menu);
			req.log.info("served up /menu");
		};
	});
	return next();
}

function serve_file(req, res, next) {
	var filename = path.join(serve_dir, req.params.id + '/' + req.params.path);
	req.log.info("serving up /" + req.params.id + '/' + req.params.path);
	fs.exists(filename, function (exists) {
		if (!exists) {
			res.send(404, '404 Not Found');
			return;
		} else {
			res.header("Content-Type", "application/octet-stream");
			res.header("Content-Length", fs.statSync(filename).size);
			var stream = fs.createReadStream(filename, { bufferSize: 64 * 1024 });
			stream.pipe(res);
		}
	});
	return next();
}


var server = restify.createServer({
	name: 'bootserver',
	version: '0.1.0'
});

var server = restify.createServer();
function setup_routes(route, handler) {
	server.get(route, handler);
	server.head(route, handler);
}

setup_routes('/menu', menu);
setup_routes('/:id/:path', serve_file);

server.log.level('info');
server.listen(serve_port, function() {
	console.log('%s listening at %s', server.name, server.url);
	console.log('serving from %s', serve_dir);
});
