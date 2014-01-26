/*
 * grunt-synthesize
 * https://github.com/jfroehlich/grunt-synthesize
 *
 * Copyright (c) 2014 Johannes Fröhlich
 * Licensed under the MIT license.
 */
module.exports = function(grunt) {
	'use strict';

	var path = require('path'),
		fs = require('fs'),
		chalk = require('chalk'),
		yaml = require('yaml-js'),
		consolidate = require('consolidate'),
		async = require('async');

	var candidateRegex = /^---[\r\n?|\n]/,
		matterRegex = /^((---[\r\n?|\n])([\s\S]+?))\2/m,
		tally = {dirs: 0, files: 0},
		options = {};

	function writeFile(srcPath, destPath, content, options) {
		grunt.file.write(destPath, content, options);
		if (options.mode !== false) {
			fs.chmodSync(destPath, (options.mode === true) ? fs.lstatSync(srcPath).mode : options.mode);
		}
	}

	function process(file, next) {
		var src = file.src,
			dest = file.dest,
			layout = options.defaultLayout,
			content = '';

		if (grunt.file.isDir(src)) {
			grunt.file.mkdir(dest);
			tally.dirs++;		
		} else {
			content = grunt.file.read(src, options);

			// When the file does not have a front matter write it to the
			// destination and return
			if (!candidateRegex.test(content) || !matterRegex.test(content)) {
				grunt.log.writeln(src + ' - copy -> ' + dest);
				writeFile(src, dest, content, options);
				tally.files++;			
				return next();
			}

			// Find the matches and replace leading/trailing space
			var matches = matterRegex.exec(content),
				ctx = yaml.load(matches[3].replace(/^\s+|\s+$/g, '')) || {},
				renderer = consolidate[options.engine];

			content = content.replace(matches[0], ''); // Remove the front matter from the content
			layout = ctx.layout || layout; // Use the given layout or the default layout

			// First pass: Render the content with the context
			renderer.render(content, ctx, function (err, result) {
				if (err) {
					throw grunt.log.error('error: Converting ' + src + '->' + dest + ' - ' + err);
				}
				ctx.content = result;

				// Second pass: Render the template with the context
				renderer('layouts/base.html', ctx, function (err, result) {
					if (err) {
						throw grunt.log.error('error: Converting ' + src + '->' + dest + ' - ' + err);
					}
					grunt.log.writeln(src + ' - construct -> ' + dest);
					writeFile(src, dest, result, options);
					tally.files++;
					next(err);
				});
			});
		}
	}

	grunt.registerMultiTask('synthesize', 'Synthesize templates, variables and content to static files.', function() {
		options = this.options({
			encoding: grunt.file.defaultEncoding,
			excludes: [],
			//preProcess: false,
			//data: {},
			defaultLayout: 'layouts/default.html',
			concurrency: require('os').cpus().length,
			mode: false,
			engine: ''
		});

		var q = async.queue(process, options.concurrency),
			done = this.async();
		
		q.drain = function () {
			
			done();
		};

		this.files.forEach(function (file) {
			var files = file.src.filter(function (path) {
				if (!grunt.file.exists(path)) {
					grunt.log.warn('Source file "' + path + '" not found.');
					return false;
				}
				return true;
			}).map(function (src) {
				var dest = file.dest;

				if (!file.orig.expand) {
					// When it's an already existing file we strip to the dirname
					if (grunt.file.exists(dest) && grunt.file.isFile(dest)) {
						dest = path.dirname(dest);
					}
					
					// If it's a dirname we join it with the source
					if (dest.indexOf('/', dest.length - 1) !== -1) {
						dest = path.join(dest, path.basename(src));
						dest = (process.platform === 'wind32') ? dest.replace(/\\/g, '/') : dest;
					}
				}

				// When the file was not expanded it should be now
				return {src: src, dest: dest};
			});
			q.push(files);
		});

		if (q.length() === 0) {
			grunt.verbose.writeln('Nothing to convert...');
			done();
		}		
	});
};

