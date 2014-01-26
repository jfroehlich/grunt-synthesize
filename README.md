
grunt-synthesize
===============================================================================

A grunt plugin to synthesize templates, variables and content to a static file.

## Getting Started

This plugin requires Grunt `~0.4.2`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out 
the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains
how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as
install and use Grunt plugins. Once you're familiar with that process, you may
install this plugin with this command:

```shell
npm install grunt-synthesize --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile
with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-synthesize');
```

## The "synthesize" task

### Overview
In your project's Gruntfile, add a section named `synthesize` to the data
object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  synthesize: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

### Options

#### options.engine
Type: `String`
Default value: `''`

The template engine to use when synthesizing content and variables to the 
resulting file. This should be a supported engine of 
[consolidate](https://github.com/visionmedia/consolidate.js/) and must be
installed separately.

When no engine is defined, a simple replacement will be used. It will replace
all occurrences of a placeholder `{{ variable }}` with the variables value from
the front matter.


#### options.defaultTemplate
Type: `String`
Default value: `''`

The path to the default template file to use when the content file does not
have a template defined as `template` in the font matter.


#### options.concurrency
Type: `String`
Default value: The number of available CPUs

The number of files processed in parallel.


#### options.mode
Type: `Boolean` or `Number`
Default value: `false`

Whether to copy or set the existing file permissions. Set to true to copy the 
existing file permissions. Or set to the mode, i.e.: 0644, that copied files 
will be set to.


### Usage Examples

#### Default Options
In this example, the default options are used to do something with whatever.
So if the `testing` file has the content `Testing` and the `123` file had the
content `1 2 3`, the generated result would be `Testing, 1 2 3.`

```js
grunt.initConfig({
  synthesize: {
    options: {},
    files: {
      'dest/default_options': ['src/testing', 'src/123'],
    },
  },
});
```

#### Custom Options
In this example, custom options are used to do something else with whatever
else. So if the `testing` file has the content `Testing` and the `123` file had
the content `1 2 3`, the generated result in this case would
be `Testing: 1 2 3 !!!`

```js
grunt.initConfig({
  synthesize: {
    options: {
      separator: ': ',
      punctuation: ' !!!',
    },
    files: {
      'dest/default_options': ['src/testing', 'src/123'],
    },
  },
});
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding
style. Add unit tests for any new or changed functionality. Lint and test your
code using [Grunt](http://gruntjs.com/).

## Release History

_(Nothing yet)_
