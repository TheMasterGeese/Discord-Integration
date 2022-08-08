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
const tabify = require('gulp-tabify')
const ts = require('gulp-typescript');
const util = require('util');
const zip = require('gulp-zip');

const exec = util.promisify(require('child_process').exec);

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
var PACKAGE = JSON.parse(fs.readFileSync('package.json'));
String.prototype.replaceAll = function (pattern, replace) { return this.split(pattern).join(replace); }
function reloadPackage(cb) { PACKAGE = JSON.parse(fs.readFileSync('package.json')); cb(); }
function DEV_DIST() { return path.join(process.env.LOCAL_DEV_DIR, PACKAGE.name + '/'); }
function pdel(patterns, options) { return () => { return del(patterns, options); }; }
function plog(message) { return (cb) => { console.log(message); cb() }; }

/**
 * Compile the source code into the distribution directory
 * @param {Boolean} keepSources Include the TypeScript SourceMaps
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
		else stream = stream.pipe(tabify(4, false));
		return stream.pipe(gulp.dest((output || DIST) + SOURCE));
	}
}

/**
 * Builds the module manifest based on the package, sources, and css.
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
function outputTestWorld() { return () => gulp.src(WORLDS + GLOB).pipe(gulp.dest((process.env.LOCAL_DATA + "\\" + DATA + WORLDS))); }

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
			let { stdout, stderr } = await exec(`docker-compose up -d`);
			console.log(stdout);
			console.log(stderr);
			do {
				({ stdout, stderr } = await exec('docker inspect --format="{{json .State.Health.Status}}" discord-integration-foundry-1'));
			} while (stdout !== '"healthy"\n');
			({ stdout, stderr } = await exec(`npx playwright test`));
			console.log(stdout);
			console.log(stderr);
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
 * Default Build operation
 */
exports.default = gulp.series(
	lint()
	, pdel([DEV_DIST() + GLOB], { force: true })
	, gulp.parallel(
		buildSource(true, false, DEV_DIST())
		, buildManifest(DEV_DIST())
		, outputLanguages(DEV_DIST())
		, outputTemplates(DEV_DIST())
		, outputStylesCSS(DEV_DIST())
		, outputSounds(DEV_DIST())
		, outputMetaFiles(DEV_DIST())
		
	)
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
);

/**
 * Extends the default build task by copying the result to the Development Environment
 */
exports.dev = gulp.series(
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

/**
 * Performs a default build and then zips the result into a bundle
 */
exports.zip = gulp.series(
	lint()
	, cleanAll()
	, gulp.parallel(
		buildSource(false, false)
		, buildManifest()
		, outputLanguages()
		, outputTemplates()
		, outputStylesCSS()
		, outputSounds()
		, outputMetaFiles()
	)
	, test()
	, compressDistribution()
	, pdel([DIST])
);
/**
 * Sets up a file watch on the project to detect any file changes and automatically rebuild those components.
 */
exports.watch = function () {
	exports.default();
	gulp.watch(SOURCE + GLOB, gulp.series(pdel(DIST + SOURCE), buildSource(true, false)));
	gulp.watch([CSS + GLOB, 'module.json', 'package.json'], buildManifest());
	gulp.watch(LANG + GLOB, gulp.series(pdel(DIST + LANG), outputLanguages()));
	gulp.watch(TEMPLATES + GLOB, gulp.series(pdel(DIST + TEMPLATES), outputTemplates()));
	gulp.watch(CSS + GLOB, gulp.series(pdel(DIST + CSS), outputStylesCSS()));
	gulp.watch(SOUNDS + GLOB, gulp.series(pdel(DIST + SOUNDS), outputSounds()));
	gulp.watch(['LICENSE', 'README.md', 'CHANGELOG.md'], outputMetaFiles());
}
/**
 * Sets up a file watch on the project to detect any file changes and automatically rebuild those components, and then copy them to the Development Environment.
 */
exports.devWatch = function () {
	const devDist = DEV_DIST();
	exports.dev();
	gulp.watch(SOURCE + GLOB, gulp.series(plog('deleting: ' + devDist + SOURCE + GLOB), pdel(devDist + SOURCE + GLOB, { force: true }), buildSource(true, false, devDist), plog('sources done.')));
	gulp.watch([CSS + GLOB, 'module.json', 'package.json'], gulp.series(reloadPackage, buildManifest(devDist), plog('manifest done.')));
	gulp.watch(LANG + GLOB, gulp.series(pdel(devDist + LANG + GLOB, { force: true }), outputLanguages(devDist), plog('langs done.')));
	gulp.watch(TEMPLATES + GLOB, gulp.series(pdel(devDist + TEMPLATES + GLOB, { force: true }), outputTemplates(devDist), plog('templates done.')));
	gulp.watch(CSS + GLOB, gulp.series(pdel(devDist + CSS + GLOB, { force: true }), outputStylesCSS(devDist), plog('css done.')));
	gulp.watch(SOUNDS + GLOB, gulp.series(pdel(devDist + SOUNDS + GLOB, { force: true }), outputSounds(devDist), plog('sounds done.')));
	gulp.watch(['LICENSE', 'README.md', 'CHANGELOG.md'], gulp.series(outputMetaFiles(devDist), plog('metas done.')));
}