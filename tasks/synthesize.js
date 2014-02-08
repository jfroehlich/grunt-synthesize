/*
 * grunt-synthesize
 * https://github.com/jfroehlich/grunt-synthesize
 *
 * Copyright (c) 2014 Johannes Fröhlich
 * Licensed under the MIT license.
 */
module.exports = function (grunt) {
	'use strict';

	var path = require('path'),
		fs = require('fs'),
		chalk = require('chalk'),
		yaml = require('yaml-js'),
		consolidate = require('consolidate'),
		async = require('async'),
		_ = require('lodash');

	var candidateRegex = /^---[\r\n?|\n]/,
		matterRegex = /^((---[\r\n?|\n])([\s\S]+?))\2/m,
		tally = {dirs: 0, copied: 0, synthesized: 0},
		options = {};

	function writeFile(srcPath, destPath, content, options) {
		grunt.file.write(destPath, content, options);
		if (options.mode !== false) {
			fs.chmodSync(destPath, (options.mode === true) ? fs.lstatSync(srcPath).mode : options.mode);
		}
	}

	function render(context, content) {
		context = (typeof context === 'object') ? context : Array.prototype.slice.call(arguments, 1);
        content = content.replace(/\{\{|\}\}|\{([\w\.]+)\}/g, function (m, n) {
			if (m === '{{') {
				return '{';
            } else if (m === '}}') {
				return '}';
            }
			
			var list = n.split('.'),
				result = context;
			while (list.length) {
		        var token = list.shift();
				if (token in result) {
		            result = result[token];
		        } else {
				    return '';
				}
			}
			return result;
		});
        return content;
    }

	function process(file, next) {
		var src = file.src,
			dest = file.dest,
			template = options.defaultTemplate,
			content = '';

		if (grunt.file.isDir(src)) {
			grunt.file.mkdir(dest);
			tally.dirs++;		
		} else {
			content = grunt.file.read(src, options);

			// When the file does not have a front matter write it to the
			// destination and return
			if (!candidateRegex.test(content) || !matterRegex.test(content)) {
				grunt.verbose.writeln(src + ' - copy -> ' + dest);
				writeFile(src, dest, content, options);
				tally.copied++;			
				return next();
			}

			// Find the matches and replace leading/trailing space
			var ctx = {},
				matches = matterRegex.exec(content),
				renderer = consolidate[options.engine];
			
			if (options.data) {
				ctx = _.merge(ctx, options.data);
			}
			ctx = _.merge(ctx, yaml.load(matches[3].replace(/^\s+|\s+$/g, '')));
			content = content.replace(matches[0], ''); // Remove the front matter from the content
			template = ctx.template || template; // Use the given layout or the default layout

			
			// When there is no engine specified, we use the build in method.
			if (!renderer) {
				content = render(ctx, content);
				grunt.verbose.writeln(src + ' - synthesize -> ' + dest);
				writeFile(src, dest, content, options);
				tally.synthesized++;
				return next();
			}


			// First pass: Render the content with the context
			renderer.render(content, ctx, function (err, result) {
				if (err) {
					throw grunt.log.error('error: Converting ' + src + '->' + dest + ' - ' + err);
				}
				ctx.content = result;

				if (!template) {
					grunt.verbose.writeln(src + ' - synthesize -> ' + dest);
					writeFile(src, dest, result, options);
					tally.synthesized++;
					return next(err);
				}

				// Second pass: Render the template with the context
				renderer(template, ctx, function (err, result) {
					if (err) {
						throw grunt.log.error('error: Converting ' + src + '->' + dest + ' - ' + err);
					}
					grunt.verbose.writeln(src + ' - synthesize -> ' + dest);
					writeFile(src, dest, result, options);
					tally.synthesized++;
					next(err);
				});
			});
		}
	}

	grunt.registerMultiTask('synthesize', 'Synthesize templates, variables and content to static files.', function() {
		options = this.options({
			encoding: grunt.file.defaultEncoding,
			//preProcess: false,
			//postProcess: false,
			data: null,
			defaultTemplate: '',
			concurrency: require('os').cpus().length,
			mode: false,
			engine: ''
		});

		var q = async.queue(process, options.concurrency),
			done = this.async();
		
		// 
		q.drain = function () {
			if (tally.dirs) {
				grunt.log.writeln('Created ' + chalk.cyan(tally.dirs.toString()) + ' directories');
			}

		    if (tally.copied) {
		      grunt.log.writeln('Copied ' + chalk.cyan(tally.copied.toString()) + (tally.copied === 1 ? ' file' : ' files'));
		    }

		    if (tally.synthesized) {
		      grunt.log.writeln('Synthesized ' + chalk.cyan(tally.synthesized.toString()) + (tally.synthesized === 1 ? ' file' : ' files'));
		    }
			
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
					// When it's an already existing file we strip to the directory 
					if (grunt.file.exists(dest) && grunt.file.isFile(dest)) {
						dest = path.dirname(dest);
					}
					
					// If it's a directory we join it with the source
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

