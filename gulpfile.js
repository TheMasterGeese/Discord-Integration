const del = require('del');
require('dotenv').config();
const eslint = require('gulp-eslint');
var fs = require('fs')
const gulp = require('gulp');
const gulpIf = require('gulp-if');
const minify = require('gulp-minify');
const path = require('path');
const rename = require('gulp-rename');
const sm = require('gulp-sourcemaps');
const stringify = require('json-stringify-pretty-compact');
const ts = require('gulp-typescript');
const util = require('util');
const zip = require('gulp-zip');

const exec = util.promisify(require('child_process').exec);

// Datapaths for specific folders, both in this repo and in the dev destination
const GLOB = '**/*';
const DIST = 'dist/';
const BUNDLE = 'bundle/';
const SOURCE = 'src/';
const LANG = 'lang/';
const TEMPLATES = 'templates/';
const CSS = 'css/';
const SOUNDS = 'sounds/';
const DATA = "Data/";
const WORLDS = 'worlds/';

// declare variables and utility functions
/**
 * The contents of package.json
 */
var PACKAGE = JSON.parse(fs.readFileSync('package.json'));

/**
 * Replaces all instances of the pattern in the string
 * @param {*} pattern The pattern to be replaced
 * @param {*} replace The new value to replace instances of the pattern.
 * @returns The string with occurrences of the pattern replaced.
 */
String.prototype.replaceAll = function (pattern, replace) { return this.split(pattern).join(replace); }

/**
 * Refreshes the value of PACKAGE based on changes made to package.json
 * @param {*} callback callback function to execute after reloading the package.
 */
function reloadPackage(callback) { PACKAGE = JSON.parse(fs.readFileSync('package.json')); callback(); }

/**
 * Generates the local filepath for the modules on a locally-deployed version of FoundryVTT.
 * @returns The generated filepath.
 */
function DEV_DIST() { return path.join(process.env.LOCAL_DEV_DIR, PACKAGE.name + '/'); }

const DOCKER_CONTAINER = process.env.DOCKER_CONTAINER;
/**
 * Wrapper for del to allow it to be considered a gulp task.
 * 
 * See https://www.npmjs.com/package/del for more information on the del function.
 * 
 * @param {*} patterns The patterns to pass to del
 * @param {*} options The options to pass to del.
 * @returns The deleted paths.
 */
function pdel(patterns, options) { return () => { return del(patterns, options); }; }

/**
 * Wrapper for console logging a message, then executing a callback function.
 * 
 * @param {*} message The message to log to the console.
 * @returns The result of the callback function execution.
 */
function plog(message) { return (cb) => { console.log(message); cb() }; }

/**
 * Compile the source code into the distribution directory
 * @param {Boolean} keepSources Include the TypeScript SourceMaps
 * @param {Boolean} minifySources Whether to minify the source files.
 * @param {string} output Where to output the build results, defaults to the current working directory.
 * 
 * @returns ReadWriteStream for the build results.
 */
function buildSource(keepSources, minifySources = false, output = null) {
	return () => {
		var stream = gulp.src(SOURCE + GLOB);
		if (keepSources) stream = stream.pipe(sm.init())
		stream = stream.pipe(ts.createProject("tsconfig.json")())
		if (keepSources) stream = stream.pipe(sm.write())
		if (minifySources) stream = stream.pipe(minify({
			ext: { min: '.js' },
			mangle: false,
			noSource: true
		}));
		return stream.pipe(gulp.dest((output || DIST) + SOURCE));
	}
}

/**
 * Builds the module manifest based on the package, sources, and css.
 * 
 * @param {string} output Where to output the build results, defaults to the current working directory.
 * 
 * @throws Error if no files are found in the src or css directories.
 */
function buildManifest(output = null) {
	const files = []; // Collector for all the file paths
	return (cb) => gulp.src(PACKAGE.main) // collect the source files
		.pipe(rename({ extname: '.js' })) // rename their extensions to `.js`
		.pipe(gulp.src(CSS + GLOB)) // grab all the CSS files
		.on('data', file => files.push(path.relative(file.cwd, file.path))) // Collect all the file paths
		.on('end', () => { // output the filepaths to the module.json
			if (files.length == 0)
				throw Error('No files found in ' + SOURCE + GLOB + " or " + CSS + GLOB);
			const js = files.filter(e => e.endsWith('js')); // split the CSS and JS files
			const css = files.filter(e => e.endsWith('css'));
			fs.readFile('module.json', (err, data) => {
				const module = data.toString() // Inject the data into the module.json
					.replaceAll('{{name}}', PACKAGE.name)
					.replaceAll('{{title}}', PACKAGE.title)
					.replaceAll('{{version}}', PACKAGE.version)
					.replaceAll('{{description}}', PACKAGE.description)
					.replace('"{{sources}}"', stringify(js, null, '\t').replaceAll('\n', '\n\t').replaceAll('\\\\', '/'))
					.replace('"{{css}}"', stringify(css, null, '\t').replaceAll('\n', '\n\t').replaceAll('\\\\', '/'));
				fs.writeFile((output || DIST) + 'module.json', module, cb); // save the module to the distribution directory
			});
		});
}

// copies the corresponding files to the output location passed in, or the DIST folder if none is given.
function outputLanguages(output = null) { return () => gulp.src(LANG + GLOB).pipe(gulp.dest((output || DIST) + LANG)); }
function outputTemplates(output = null) { return () => gulp.src(TEMPLATES + GLOB).pipe(gulp.dest((output || DIST) + TEMPLATES)); }
function outputStylesCSS(output = null) { return () => gulp.src(CSS + GLOB).pipe(gulp.dest((output || DIST) + CSS)); }
function outputSounds(output = null) { return () => gulp.src(SOUNDS + GLOB).pipe(gulp.dest((output || DIST) + SOUNDS)); }
function outputMetaFiles(output = null) { return () => gulp.src(['LICENSE', 'README.md', 'CHANGELOG.md']).pipe(gulp.dest((output || DIST))); }
function outputTestWorld() { return () => gulp.src(WORLDS + GLOB).pipe(gulp.dest((process.env.LOCAL_DATA + "/" + DATA + WORLDS))); }

/**
 * Copy files to module named directory and then compress that folder into a zip
 */
function compressDistribution() {
	return gulp.series(
		// Copy files to folder with module's name
		() => gulp.src(DIST + GLOB)
			.pipe(gulp.dest(DIST + `${PACKAGE.name}/${PACKAGE.name}`))
		// Compress the new folder into a ZIP and save it to the `bundle` folder
		, () => gulp.src(DIST + PACKAGE.name + '/' + GLOB)
			.pipe(zip(PACKAGE.name + '.zip'))
			.pipe(gulp.dest(BUNDLE))
		// Copy the module.json to the bundle directory
		, () => gulp.src(DIST + 'module.json')
			.pipe(gulp.dest(BUNDLE))
		// Cleanup by deleting the intermediate module named folder
		, pdel(DIST + PACKAGE.name)
	);
}

/**
 * Runs eslint. Fixes any automatically-fixable errors, and will fail if any errors are encountered (but not warnings)
 * 
 * @returns ReadWriteStream for the build results so far.
 */
function lint() {
	return function lint() {
		return gulp.src(SOURCE + GLOB)
			.pipe(eslint(".eslintrc"))
			.pipe(eslint({ fix: true }))
			.pipe(eslint.format())
			.pipe(gulpIf(isFixed, gulp.dest(SOURCE)))
			.pipe(eslint.failAfterError());
	}
	/**
	 * Helper function to determine if a file was fixed by eslint
	 * @param {*} file The file to examine
	 * @returns True if the file was fixed, false if it was not or the file does not exist.
	 */
	function isFixed(file) {
		return file.eslint != null && file.eslint.fixed;
	}
}

exports.lint = lint();

/*
 * Runs Tests via playwright. Builds up and tears down a fresh FoundryVTT container to run the tests on.
 */
function test() {
	return async function test() {
		// Startup docker container
		let { stdout, stderr } = await exec(`docker-compose up -d`);
		console.log(stdout);
		console.log(stderr);
		// Wait for the state of the docker container to be "healthy". Waiting for the container startup isn't enough, it takes 
		// roughly 1 more minute after the container is started for FoundryVTT to be ready, indicated by the "healthy" status.
		do {
			({ stdout, stderr } = await exec(`docker inspect --format="{{json .State.Health.Status}}" ${DOCKER_CONTAINER}`));
		} while (stdout !== '"healthy"\n');
		// run tests
		({ stdout, stderr } = await exec(`npx playwright test`));
		console.log(stdout);
		console.log(stderr);
		// tear down docker container
		({ stdout, stderr } = await exec(`docker-compose down`));
		console.log(stdout);
		console.log(stderr);
	}
}
exports.test = test();

/**
 * Simple clean command, cleans out DIST and BUNDLE folders.
 */
exports.clean = pdel([DIST, BUNDLE]);

/**
 * Cleans ALL content in the foundrydata folder.
 */
function cleanAll() {
	return gulp.series(
		pdel([process.env.LOCAL_DATA], {
			"force": "true"
		}),
		() => gulp.src('*.*', { read: false })
			.pipe(gulp.dest(process.env.LOCAL_DATA))

	);
}
exports.cleanAll = cleanAll();

/**
 * Default Build operation.
 * 
 * Lints the module code, then clears out and rebuilds the dev directory with test setup and the module code.
 * 
 * Runs tests on the code, then performs all build functions to output the build results as a zip file.
 */
exports.default = gulp.series(
	lint()
	, dev()
	, outputTestWorld()
	, test()
	, gulp.parallel(
		buildSource(true, false)
		, buildManifest()
		, outputLanguages()
		, outputTemplates()
		, outputStylesCSS()
		, outputSounds()
		, outputMetaFiles()
	)
	, compressDistribution()
	, pdel([DIST])
);

/**
 * Builds the current code/configuration to the local dev environment.
 */
function dev() {
	return gulp.series(
		pdel([DEV_DIST() + GLOB], { force: true })
		, gulp.parallel(
			buildSource(true, false, DEV_DIST())
			, buildManifest(DEV_DIST())
			, outputLanguages(DEV_DIST())
			, outputTemplates(DEV_DIST())
			, outputStylesCSS(DEV_DIST())
			, outputSounds(DEV_DIST())
			, outputMetaFiles(DEV_DIST())
		)
	);
}
exports.dev = dev();
/**
 * Sets up a file watch on the project to detect any file changes and automatically rebuild those components, and then copy them to the Development Environment.
 */
exports.watch = function () {
	const devDist = DEV_DIST();
	gulp.watch(SOURCE + GLOB, gulp.series(plog('deleting: ' + devDist + SOURCE + GLOB), pdel(devDist + SOURCE + GLOB, { force: true }), buildSource(true, false, devDist), plog('sources done.')));
	gulp.watch([CSS + GLOB, 'module.json', 'package.json'], gulp.series(reloadPackage, buildManifest(devDist), plog('manifest done.')));
	gulp.watch(LANG + GLOB, gulp.series(pdel(devDist + LANG + GLOB, { force: true }), outputLanguages(devDist), plog('langs done.')));
	gulp.watch(TEMPLATES + GLOB, gulp.series(pdel(devDist + TEMPLATES + GLOB, { force: true }), outputTemplates(devDist), plog('templates done.')));
	gulp.watch(CSS + GLOB, gulp.series(pdel(devDist + CSS + GLOB, { force: true }), outputStylesCSS(devDist), plog('css done.')));
	gulp.watch(SOUNDS + GLOB, gulp.series(pdel(devDist + SOUNDS + GLOB, { force: true }), outputSounds(devDist), plog('sounds done.')));
	gulp.watch(['LICENSE', 'README.md', 'CHANGELOG.md'], gulp.series(outputMetaFiles(devDist), plog('metas done.')));
}